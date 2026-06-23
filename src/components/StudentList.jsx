import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { BackwardIcon, CheckIcon, ForwardIcon, PencilSquareIcon, TrashIcon, UserCircleIcon} from '@heroicons/react/24/solid';
import CustomModal from "./CustomModal";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from './AuthContext';

export default function StudentList() {
  const { user, role } = useAuth();

  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const studentPerPage = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(() => () => {});
  const [resultsFound, setResultsFound] = useState(0);

  const [gradelevel, setGradeLevel] = useState('');
  const [strand, setStrand] = useState('');
  const [section, setSection] = useState('');
  const [adviser, setAdviser] = useState('');
  const [advisers, setAdvisers] = useState([]);
  const [adviserLoading, setAdviserLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllRows, setSelectAllRows] = useState(false);


const fetchStudents = useCallback(async (search = '', gradelevel = '', strand = '', section = '', adviser = '') => {
  if (!user?.id) {
    console.warn('No user logged in yet.');
    return;
  }

  try {
    let query = supabase
      .from('tblstudents')
      .select('*', { count: 'exact' })
      .order('date_added', { ascending: false });

    const userRole = (user.role || role || '').toLowerCase();

    const isSuperAdmin = Number(user.id) === 1;

    if (isSuperAdmin || userRole === 'admin') {
      // Super admin and admins can view all students.
    } else if (userRole === 'teacher') {
      query = query.eq('adviser', user.id);
    } else {
      setStudents([]);
      setResultsFound(0);
      setTotalCount(0);
      return;
    }

    if (search) query = query.or(
      `lrn.ilike.%${search}%,firstname.ilike.%${search}%,lastname.ilike.%${search}%,middlename.ilike.%${search}%`
    );
    if (gradelevel) query = query.eq('gradelevel', gradelevel);
    if (strand) query = query.eq('strand', strand);
    if (section) query = query.eq('section', section);
    if (adviser) query = query.eq('adviser', Number(adviser));

    const { data, error, count } = await query;
    if (error) throw error;

    // student.profile_url is already a full public URL from upload time
    setStudents(data);
    setResultsFound(search || gradelevel || strand || section || adviser ? count : null);
    setTotalCount(search || gradelevel || strand || section || adviser ? null : count);

  } catch (err) {
    console.error('Error fetching students:', err);
  }
}, [user, role]);

const fetchAdvisers = useCallback(async () => {
  setAdviserLoading(true);

  try {
    const { data, error } = await supabase
      .from('tbluser')
      .select('id, firstname, lastname, middlename, role')
      .ilike('role', 'teacher')
      .order('lastname', { ascending: true });

    if (error) throw error;

    setAdvisers(data || []);
  } catch (err) {
    console.error('Error fetching advisers:', err);
    setAdvisers([]);
  } finally {
    setAdviserLoading(false);
  }
}, []);


useEffect(() => {
  if (!user) return; // wait until user is ready

  // Fetch from URL params
  const params = new URLSearchParams(location.search);
  const search = params.get('search') || '';
  const grade = params.get('gradelevel') || '';
  const str = params.get('strand') || '';
  const sec = params.get('section') || '';
  const adv = params.get('adviser') || '';

  setSearchTerm(search);
  setGradeLevel(grade);
  setStrand(str);
  setSection(sec);
  setAdviser(adv);

  // Fetch students immediately
  fetchStudents(search, grade, str, sec, adv);

}, [fetchStudents, location.search, user]);

useEffect(() => {
  if (role === 'admin' || Number(user?.id) === 1) {
    fetchAdvisers();
  }
}, [fetchAdvisers, role, user]);


useEffect(() => {
  if (!user) return; // <-- important!

  const delayDebounce = setTimeout(() => {
    fetchStudents(searchTerm, gradelevel, strand, section, adviser);
  }, 300);

  return () => clearTimeout(delayDebounce);
}, [fetchStudents, searchTerm, gradelevel, strand, section, adviser, user]); // add `user` as dependency



  const currentStudents = useMemo(() => {
    const start = pageIndex * studentPerPage;
    const end = start + studentPerPage;
    return students.slice(start, end);
  }, [students, pageIndex, studentPerPage])

  const handleEdit = (id) => {
    localStorage.setItem(
      'student-filters',
      JSON.stringify({
        search: searchTerm,
        gradelevel,
        strand,
        section,
        adviser,
      })
    );
    navigate(`/signup?id=${id}`);
  };

  const handleDelete = async (id) => {
    setModalTitle("Are you sure you want to delete this student?");
    // setModalMessage("Are you sure you want to delete this student?");
    setShowConfirm(true);

    setConfirmCallback(() => async () => {
      try {
        // 1️⃣ Get student's profile URL
        const { data: student, error: fetchError } = await supabase
          .from('tblstudents')
          .select('profile_url')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // 2️⃣ Delete profile image from storage if exists
        if (student?.profile_url) {
          const url = new URL(student.profile_url);
          const filePath = url.pathname.replace('/storage/v1/object/public/id-profile/', '');

          if (filePath) {
            const { error: delError } = await supabase.storage
              .from('id-profile')
              .remove([filePath]);

            if (delError) console.error("Failed to delete profile:", delError);
            else console.log("Profile deleted:", filePath);
          }
        }

        // 3️⃣ Delete student record
        const { error: deleteError } = await supabase
          .from('tblstudents')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        setShowConfirm(false);
        setModalOpen(false);
        fetchStudents(searchTerm, gradelevel, strand, section, adviser);

      } catch (err) {
        console.error(err);
        setModalOpen(false);
        setModalTitle("Error");
        setModalMessage("Failed to delete student.");
        setShowConfirm(false);
        setModalOpen(true);
      }
    });

    setModalOpen(true);
  };


  useEffect(() => {
    if (selectedRows.length === students.length && students.length > 0) {
      setSelectAllRows(true);
    } else {
      setSelectAllRows(false);
    }
  }, [selectedRows, students]);


  const handleFetchSelected = async () => {

    if (!selectedRows || selectedRows.length === 0) {
      setModalTitle("Please select student(s) to continue.");
      setModalMessage("Please select student(s) to continue.");
      setShowConfirm(false);
      setModalOpen(true);
      return;
    }

    try {
      // Fetch selected students from Supabase
      const { data, error } = await supabase
        .from('tblstudents')
        .select('*')
        .in('id', selectedRows);

      if (error) throw error;

      // student.profile_url is already a full public URL from upload time
      navigate("/students/printid", {
        state: {
          ids: selectedRows,
          students: data
        }
      });
    } catch (err) {
      console.error('Error fetching selected students:', err);
    }
  };

  const handleToggleClaimed = async (id, claimed) => {
    try {
      const updateData = {
        claimed: claimed ? 1 : 0,
        date_claimed: claimed ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('tblstudents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setStudents(prev =>
        prev.map(s =>
          s.id === id ? { ...s, claimed, date_claimed: updateData.date_claimed } : s
        )
      );
    } catch (err) {
      console.error("Failed to update claimed status:", err);
    }
  };

    return (
  <div className="flex h-dvh min-w-0 flex-col px-3 pt-8 pb-6 sm:px-6 overflow-hidden">

    {/* ── Filter bar ── */}
    <div className="sticky top-12 z-10 bg-white flex w-full flex-col lg:flex-row items-center gap-2">
      <div className="flex lg:flex-row flex-col w-full gap-2">
        <div className="flex-1">
          <input
            className="text-xs lg:text-sm w-full border border-gray-400 p-2 py-3 rounded"
            placeholder="Type LRN or name here"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {role === 'admin' && (
    
            <div className="flex gap-2 flex-row">
              <select
                value={gradelevel}
                className="w-full flex-1 text-xs lg:text-sm p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                <option value="">by Grade Level</option>
                <option value="g7">Grade 7</option>
                <option value="g8">Grade 8</option>
                <option value="g9">Grade 9</option>
                <option value="g10">Grade 10</option>
                <option value="g11">Grade 11</option>
                <option value="g12">Grade 12</option>
              </select>
              
              <select
                value={strand}
                className="w-full flex-1 text-xs lg:text-sm p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                onChange={(e) => setStrand(e.target.value)}
              >
                <option value="">by Strand</option>
                <option value="ACAD">Academic</option>
                <option value="TECHPRO">Technical-Professional</option>
                <option value="ABM">Accountancy, Business, and Management (ABM)</option>
                <option value="HUMSS">Humanities and Social Sciences (HUMSS)</option>
                <option value="HE">Home Economics (HE)</option>
                <option value="ICT">Information and Communications Technology (ICT)</option>
              </select>

              <select
              value={adviser}
              className="w-full flex-1 text-xs lg:text-sm p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              onChange={(e) => setAdviser(e.target.value)}
            >
              <option value="">{adviserLoading ? 'Loading advisers...' : 'by Adviser'}</option>
              {!adviserLoading && advisers.length === 0 && (
                <option value="" disabled>No advisers found</option>
              )}
              {advisers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {`${teacher.lastname}, ${teacher.firstname} ${teacher.middlename || ''}`.trim()}
                </option>
              ))}
            </select>

                  {role === 'admin' && (
        <button
          className="text-xs lg:text-sm bg-gray-500 text-white p-3 rounded hover:bg-gray-400"
          onClick={() => {
            setSearchTerm('');
            setGradeLevel('');
            setStrand('');
            setSection('');
            setAdviser('');
            localStorage.removeItem('student-filters');
            navigate('/students', { replace: true });
            fetchStudents();
          }}
        >
          Clear Filter
        </button>
      )}
            </div>

            
      
        )}
      </div>
    </div>

    {/* ── Main container ── */}
    <div className="mx-auto mt-14 flex min-h-0 w-full max-w-full flex-1 flex-col rounded-lg border border-gray-400 p-2 lg:mt-16">
      <h2 className="text-xl lg:text-2xl font-bold text-center mt-2 flex-shrink-0">Student List</h2>

      {/* ── Count + Pagination ── */}
      <div className="flex gap-2 flex-row justify-between items-center mb-2">
        <p className="sm:text-lg text-xs font-bold">
          Results Found: {resultsFound !== null ? resultsFound : totalCount}
        </p>
        <div className="flex flex-row items-center gap-2">
          <p className="text-sm text-gray-600 whitespace-nowrap">
            Page {pageIndex + 1} of {Math.ceil(students.length / studentPerPage)}
          </p>
          <div className="no-print flex flex-row gap-2 justify-center items-center">
            <button
              onClick={() => setPageIndex((prev) => prev - 1)}
              disabled={pageIndex === 0}
              className="w-10 lg:w-14 h-8 flex items-center justify-center bg-gray-400 rounded hover:bg-gray-500 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
            >
              <BackwardIcon className="lg:w-6 w-4 h-6 text-black" />
            </button>
            <button
              onClick={() => setPageIndex((prev) => prev + 1)}
              disabled={(pageIndex + 1) * studentPerPage >= students.length}
              className="w-10 lg:w-14 h-8 flex items-center justify-center bg-gray-400 rounded hover:bg-gray-500 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
            >
              <ForwardIcon className="lg:w-6 w-4 h-6 text-black" />
            </button>
          </div>

          <div className="bg-gray-500 w-1 h-8 rounded-lg"></div>

          <button
            className="hidden lg:block text-xs lg:text-sm bg-sky-900 text-white px-16 py-2 rounded hover:bg-sky-700"
            onClick={handleFetchSelected}
          >
            Generate ID
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">

        {/* ════════════════════════════════════
            MOBILE — Card layout (< md)
        ════════════════════════════════════ */}
        <div className="md:hidden flex flex-col gap-3">
          {Array.isArray(students) && students.length === 0 ? (
            <p className="text-center p-4 text-gray-600">********** No records found **********.</p>
          ) : (
            currentStudents?.map((s, index) => (
              <div
                key={index}
                className="bg-gray-100 border border-gray-300 rounded-lg p-3 flex flex-col gap-2"
              >
                {/* Card header — avatar + name + checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0"
                    checked={selectedRows.includes(s.id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        setSelectedRows((prev) => [...prev, s.id]);
                      } else {
                        setSelectedRows((prev) => prev.filter((id) => id !== s.id));
                      }
                    }}
                  />
                  {s.profile_url ? (
                    <img
                      src={s.profile_url}
                      alt="Profile"
                      className="w-12 h-12 object-cover rounded-full shadow-md border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <UserCircleIcon className="w-12 h-12 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold uppercase truncate">
                      {s.lastname}, {s.firstname} {s.middlename}
                    </p>
                    <p className="text-xs text-gray-500">LRN: {s.lrn}</p>
                  </div>
                  {/* Claimed badge */}
                  <span
                    className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${
                      s.claimed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s.claimed ? 'Claimed' : 'Not Claimed'}
                  </span>
                </div>

                {/* Card body — details grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-gray-300 pt-2">
                  <div>
                    <p className="text-gray-500 font-medium">Parent / Guardian</p>
                    <p className="uppercase">{s.parent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Contact</p>
                    <p>{s.parentnumber}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 font-medium">Address</p>
                    <p className="uppercase">Brgy. {s.brgy}, {s.town}, {s.province}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Grade Level</p>
                    <p className="uppercase">{s.gradelevel}</p>
                  </div>
                  {role === 'admin' && (
                    <>
                      <div>
                        <p className="text-gray-500 font-medium">Strand</p>
                        <p className="uppercase">{s.strand}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Section</p>
                        <p className="uppercase">{s.section}</p>
                      </div>
                    </>
                  )}
                  {s.claimed && s.date_claimed && (
                    <div>
                      <p className="text-gray-500 font-medium">Date Claimed</p>
                      <p>{new Date(s.date_claimed).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Admin toggle + actions */}
                <div className="flex items-center justify-between border-t border-gray-300 pt-2">
                  {role === 'admin' && (
                    <label className={`inline-flex items-center gap-2 ${s.claimed ? '' : 'cursor-pointer'}`}>
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={s.claimed}
                          disabled={s.claimed}
                          onChange={(e) => handleToggleClaimed(s.id, e.target.checked)}
                        />
                        <div className="w-11 h-6 rounded-full transition-colors bg-gray-400 peer-checked:bg-green-500"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-5"></div>
                        {s.claimed && (
                          <div className="absolute inset-0 flex items-center pl-1 pointer-events-none">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      className="flex items-center gap-1 text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50"
                      onClick={() => handleEdit(s.id)}
                    >
                      <PencilSquareIcon className="w-4 h-4" /> Edit
                    </button>
                    <button
                      className="flex items-center gap-1 text-xs text-red-700 border border-red-300 rounded px-2 py-1 hover:bg-red-50"
                      onClick={() => handleDelete(s.id)}
                    >
                      <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ════════════════════════════════════
            DESKTOP — Original table (≥ md)
        ════════════════════════════════════ */}
        <table className="hidden lg:table w-full min-w-[900px] table-auto uppercase">
          <thead className="text-xs lg:text-md bg-gray-400 text-sky-900 sticky top-0 z-20 shadow-[0_2px_0_0_#0c4a6e]">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={selectAllRows}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setSelectAllRows(isChecked);
                    if (isChecked) {
                      setSelectedRows(students.map((s) => s.id));
                    } else {
                      setSelectedRows([]);
                    }
                  }}
                />
              </th>
              <th className="p-2">Profile</th>
              <th className="p-2">LRN</th>
              <th className="p-2">Name</th>
              <th className="p-2">Parent/Guardian</th>
              <th className="p-2">Parent's Number</th>
              <th className="p-2">Address</th>
              <th className="p-2">Grade Level</th>
              {role === 'admin' && (
                <>
                  <th className="p-2">Strand</th>
                  <th className="p-2">Section</th>
                  <th className="p-2">Status</th>
                </>
              )}
              {role !== 'admin' && <th className="p-2">Status</th>}
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {/* ... your original tbody rows unchanged ... */}
            {Array.isArray(students) && students.length === 0 ? (
              <tr>
                <td colSpan="12" className="text-center p-4 text-gray-600">
                  ********** No records found **********.
                </td>
              </tr>
            ) : (
              currentStudents?.map((s, index) => (
                <tr key={index} className="text-xs lg:text-sm hover:bg-gray-300 text-sm bg-gray-200">
                 <td className="text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 cursor-pointer"
                            checked={selectedRows.includes(s.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              if(isChecked) {
                                setSelectedRows((prev) => [...prev, s.id]);
                              } else {
                                setSelectedRows((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-2 text-center">
                            {s.profile_url ? (
                              <img
                                src={s.profile_url}
                                alt="Profile"
                                className="w-16 h-16 object-cover rounded-full mx-auto shadow-md border border-gray-100"
                              />
                          ) : (
                            <div className="h-16 w-16 flex items-center justify-center">
                              <UserCircleIcon className="text-gray-400"/>
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center">{s.lrn}</td>
                        <td className="p-2">{s.lastname}, {s.firstname} {s.middlename}</td>
                        <td className="p-2">{s.parent}</td>
                        <td className="p-2">{s.parentnumber}</td>
                        <td className="p-2">BRGY. {s.brgy}, {s.town}, {s.province}</td>
                        <td className="p-2 text-center">{s.gradelevel}</td>
                        {(role === 'admin') && (
                          <>
                            <td className="p-2 text-center">{s.strand}</td>
                            <td className="p-2 text-center">{s.section}</td>
                            <td className="border p-2">
                              <label className={`inline-flex items-center gap-2 ${s.claimed ? '' : 'cursor-pointer'}`}>

                                <div className="relative flex items-center">

                                  {/* Hidden checkbox (peer) */}
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={s.claimed}
                                    disabled={s.claimed}
                                    onChange={(e) => handleToggleClaimed(s.id, e.target.checked)}
                                  />

                                  {/* Track */}
                                  <div className="
                                    w-11 h-6 rounded-full transition-colors
                                    bg-gray-400 peer-checked:bg-green-500
                                  "></div>

                                  {/* Knob */}
                                  <div className="
                                    absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow
                                    transition-all
                                    peer-checked:translate-x-5
                                  "></div>

                                  {/* Checkmark overlay when claimed */}
                                  {s.claimed ? (
                                    <div className="absolute inset-0 flex items-center pl-1 pointer-events-none">
                                      <CheckIcon className="w-4 h-4 text-white" />
                                    </div>
                                  ) : (
                                    ""
                                  )}

                                </div>

                                <div className="flex flex-col items-center text-[8pt] font-medium ml-1">
                                  {s.claimed ? "Claimed" : "Not Claimed"}
                                  {s.claimed && s.date_claimed ? (
                                    <span className="text-[6pt] text-gray-500">
                                      {new Date(s.date_claimed).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                </div>

                              </label>
                            </td>
                          </>
                        )}
                        {(role !== 'admin') && (
                          <td className="border p-2">
                            <div className="flex flex-col items-center text-[8pt] font-medium ml-1">
                                {s.claimed ? "Claimed" : "Not Claimed"}
                                {s.claimed && s.date_claimed ? (
                                  <span className="text-[6pt] text-gray-500">
                                    {new Date(s.date_claimed).toLocaleDateString()}
                                  </span>
                                ) : (
                                  ""
                                )}
                              </div>
                          </td>
                        )}
                        <td className="p-2">
                            <div className="flex flex-row gap-2">
                                <PencilSquareIcon className="cursor-pointer w-8 h-8 text-green-700 mx-auto hover:text-green-900" onClick={() => handleEdit(s.id)} />
                                <TrashIcon className="cursor-pointer w-8 h-8 text-red-700 mx-auto hover:text-red-900" onClick={() => handleDelete(s.id)} />
                            </div>
                        </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>

      <CustomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmCallback}
        title={modalTitle}
        message={modalMessage}
        showConfirm={showConfirm}
      />
    </div>
  </div>
);
};

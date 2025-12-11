import { useEffect, useState, useMemo } from "react";
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

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllRows, setSelectAllRows] = useState(false);


const fetchStudents = async (search = '', gradelevel = '', strand = '', section = '') => {
  if (!user?.id) {
    console.warn('No user logged in yet.');
    return;
  }

  try {
    let query = supabase
      .from('tblstudents')
      .select('*', { count: 'exact' })
      .order('date_added', { ascending: false });

    if (user.id !== 1) query = query.eq('adviser', user.id);

    if (search) query = query.or(
      `lrn.ilike.%${search}%,firstname.ilike.%${search}%,lastname.ilike.%${search}%,middlename.ilike.%${search}%`
    );
    if (gradelevel) query = query.eq('gradelevel', gradelevel);
    if (strand) query = query.eq('strand', strand);
    if (section) query = query.eq('section', section);

    const { data, error, count } = await query;
    if (error) throw error;

    const studentsWithImages = await Promise.all(
      data.map(async student => {
        if (student.profile_url) {
          const { data: urlData } = supabase.storage.from('id-profile').getPublicUrl(student.profile_url);
          return { ...student, profileUrl: urlData.publicUrl };
        }
        return student;
      })
    );

    setStudents(studentsWithImages);
    setResultsFound(search || gradelevel || strand || section ? count : null);
    setTotalCount(search || gradelevel || strand || section ? null : count);

  } catch (err) {
    console.error('Error fetching students:', err);
  }
};


useEffect(() => {
  if (!user) return; // wait until user is ready

  // Fetch from URL params
  const params = new URLSearchParams(location.search);
  const search = params.get('search') || '';
  const grade = params.get('gradelevel') || '';
  const str = params.get('strand') || '';
  const sec = params.get('section') || '';

  setSearchTerm(search);
  setGradeLevel(grade);
  setStrand(str);
  setSection(sec);

  // Fetch students immediately
  fetchStudents(search, grade, str, sec);

}, [location.search, user]);


useEffect(() => {
  if (!user) return; // <-- important!

  const delayDebounce = setTimeout(() => {
    fetchStudents(searchTerm, gradelevel, strand, section);
  }, 300);

  return () => clearTimeout(delayDebounce);
}, [searchTerm, gradelevel, strand, section, user]); // add `user` as dependency



  const currentStudents = useMemo(() => {
    const start = pageIndex * studentPerPage;
    const end = start + studentPerPage;
    return students.slice(start, end);
  }, [students, pageIndex])

  const handleEdit = (id) => {
    localStorage.setItem(
      'student-filters',
      JSON.stringify({
        search: searchTerm,
        gradelevel,
        strand,
        section,
      })
    );
    navigate(`/signup?id=${id}`);
  };

  const handleDelete = async (id) => {
    setModalTitle("Delete Confirmation");
    setModalMessage("Are you sure you want to delete this student?");
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
        fetchStudents(searchTerm, gradelevel, strand, section);

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
      setModalTitle("Generate ID");
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

      // Get profile picture URLs
      const studentsWithImages = await Promise.all(
        data.map(async (student) => {
          if (student.profile) {
            const { data: urlData } = supabase.storage
              .from('id-profile')
              .getPublicUrl(student.profile_url);
            
            return {
              ...student,
              profileUrl: urlData.publicUrl
            };
          }
          return student;
        })
      );

      navigate("/students/printid", {
        state: {
          ids: selectedRows,
          students: studentsWithImages
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
      <div className="h-screen px-6 mt-8 overflow-hidden">
        
          <div className="sticky top-12 z-10 mx-auto bg-white flex flex-col lg:flex-row items-center gap-2 max-w-full">
            <div className="flex flex-col w-full gap-2 lg:flex-row">
              <input className="text-xs lg:text-sm w-full flex-1 border border-gray-400 p-2 rounded" placeholder="Type LRN or name here" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {role === 'admin' && (
                <>
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
                    className="w-full flex-1 text-xs lg:text-sm w-full p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    onChange={(e) => setStrand(e.target.value)}
                  >
                    <option value="">by Strand</option>
                    <option value="ABM">Accountancy, Business, and Management (ABM)</option>
                    <option value="STEM">Science, Technology, Engineering, and Mathematics (STEM)</option>
                    <option value="HUMSS">Humanities and Social Sciences (HUMSS)</option>
                    <option value="GAS">General Academic Strand (GAS)</option>
                    <option value="HE">Home Economics (HE)</option>
                    <option value="AFA">Agri-Fishery Arts (AFA)</option>
                    <option value="ICT">Information and Communications Technology (ICT)</option>
                    <option value="IA">Industrial Arts (IA)</option>
                  </select>
                  <select
                    value={section}
                    className="w-full flex-1 text-xs lg:text-sm p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="">by Section</option>
                    <option value="jnc">JNC</option>
                    <option value="dvt">DVT</option>
                    <option value="etb">ETB</option>
                    <option value="rlb">RLB</option>
                    <option value="cpc">CPC</option>
                    <option value="rbp">RBP</option>
                    <option value="aag">AAG</option>
                  </select>
                </>
              )}
            </div>
            {role === 'admin' && (
              <div className="flex lg:w-1/3 w-full gap-2">
                <button
                  className="text-xs lg:text-sm w-full bg-gray-500 text-white p-3 rounded hover:bg-gray-400"
                  onClick={() => {
                    setSearchTerm('');
                    setGradeLevel('');
                    setStrand('');
                    setSection('');
                    localStorage.removeItem('student-filters');
                    navigate('/students', { replace: true });
                    fetchStudents();
                  }}
                >
                  Clear Filter
                </button>
                <button
                    className="hidden lg:block text-xs lg:text-sm w-full bg-sky-900 text-white p-3 rounded hover:bg-sky-700"
                    onClick={handleFetchSelected}
                >
                    Generate ID
                </button>
              </div>
            )}
          </div>
    
        <div className="max-w-full mx-auto mt-16 rounded-lg border border-gray-400 p-2">
          <h2 className="text-xl lg:text-2xl font-bold text-center mt-2">Student List</h2>
          <div className="flex justify-between items-center mb-2">
            {resultsFound !== null ? (
              <p className="sm:text-lg text-xs font-bold">Results Found: {resultsFound}</p>
            ) : (
              <p className="sm:text-lg text-xs font-bold">Results Found: {totalCount}</p>
            )}
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">
                Page {pageIndex + 1} of {Math.ceil(students.length / studentPerPage)}
              </p>
              <div className="no-print flex flex-row gap-2 justify-center items-center">
                  <button
                      onClick={() => setPageIndex(prev => prev - 1)}
                      disabled={pageIndex === 0}
                      className="w-10 lg:w-14 h-8 flex items-center justify-center bg-gray-400 rounded hover:bg-gray-500 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <BackwardIcon className="lg:w-6 w-4 h-6 text-black" />
                    </button>
                    <button
                      onClick={() => setPageIndex(prev => prev + 1)}
                      disabled={(pageIndex + 1) * studentPerPage >= students.length}
                      className="w-10 lg:w-14 h-8 flex items-center justify-center bg-gray-400 rounded hover:bg-gray-500 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ForwardIcon className="lg:w-6 w-4 h-6 text-black" />
                  </button>
              </div>
            </div>
          </div>
          <div className="max-h-[75vh] xl:max-h-[65vh] overflow-y-auto">
            <table className="w-full min-w-[1000px] table-auto uppercase">
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
                        if(isChecked) {
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
                  {(role === 'admin') && (
                    <>
                      <th className="p-2">Strand</th>
                      <th className="p-2">Section</th>
                      <th className="p-2">Status</th>
                    </>
                  )}
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
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
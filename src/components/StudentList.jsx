import { useEffect, useState } from "react";
import axios from "axios";
import { PencilSquareIcon, TrashIcon, UserCircleIcon} from '@heroicons/react/24/solid';
import CustomModal from "./CustomModal";
import { useNavigate, useLocation } from "react-router-dom";

export default function StudentList() {

    const API_URL = process.env.REACT_APP_API_URL;

    const [students, setStudents] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage, setModalMessage] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [confirmCallback, setConfirmCallback] = useState(() => () => {});
    const [resultsFound, setResultsFound] = useState(0);

    const [strand, setStrand] = useState('');
    const [section, setSection] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const search = params.get('search') || '';
  const strand = params.get('strand') || '';
  const section = params.get('section') || '';

  setSearchTerm(search);
  setStrand(strand);
  setSection(section);

  fetchStudents(search, strand, section);
}, [location.search]); // 👈 Use `location.search` only



    const fetchStudents = async (search = '', strand = '', section = '') => {
      try {
        const res = await axios.get(`https://anabel-subproportional-divaricately.ngrok-free.dev/api/students?search=${search}&strand=${strand}&section=${section}`);
        setStudents(res.data.students);

        if (search || strand || section) {
          setResultsFound(res.data.resultsFound ?? 0);
          setTotalCount(null); // hide totalCount when searching
        } else {
          setTotalCount(res.data.total ?? 0);
          setResultsFound(null); // hide resultsFound when not searching
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };


    useEffect(() => {
      const delayDebounce = setTimeout(() => {
        handleSearch();
      }, 300); // delay for debounce typing

      return () => clearTimeout(delayDebounce);
    }, [searchTerm, strand, section]); // re-trigger when search or strand changes


    const handleEdit = (id) => {
      localStorage.setItem(
        'student-filters',
        JSON.stringify({
          search: searchTerm,
          strand,
          section,
        })
      );
      navigate(`/signup?id=${id}`);
    };



    const handleSearch = async() => {
      fetchStudents(searchTerm, strand, section);
    }

    const handleDelete = async (id) => {
        setModalTitle("Delete Confirmation");
        setModalMessage("Are you sure you want to delete this student?");
        setShowConfirm(true);
        setConfirmCallback(() => async () => {
          try {
              await axios.delete(`${API_URL}/api/students/${id}`);
              setShowConfirm(false);
              setModalOpen(false);
              fetchStudents(searchTerm, strand, section);
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
    }

    return (
      <div className="px-4 mt-14">
        
          <div className="sticky top-12 z-10 w-full mx-auto bg-white flex flex-col lg:flex-row items-center gap-4 max-w-6xl pt-8 pb-4">
            <input className="w-full lg:flex-1 border border-gray-400 p-2 rounded" placeholder="Type name... (e.g. john)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select
              value={strand}
              className="w-full flex-1 p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              onChange={(e) => setStrand(e.target.value)}
            >
              <option value="">-- Filter by Strand --</option>
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
              className="w-full flex-1 p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">-- Filter by Section --</option>
              <option value="jnc">JNC</option>
              <option value="dvt">DVT</option>
              <option value="etb">ETB</option>
              <option value="rlb">RLB</option>
              <option value="cpc">CPC</option>
              <option value="rbp">RBP</option>
              <option value="aag">AAG</option>
            </select>
            <button
              className="w-full lg:w-48 bg-gray-500 text-white p-3 rounded hover:bg-gray-400"
              onClick={() => {
                setSearchTerm('');
                setStrand('');
                setSection('');
                localStorage.removeItem('student-filters');
                navigate('/students', { replace: true });
                fetchStudents();
              }}
            >
              Clear Filter
            </button>
          </div>
      
        <div className="max-w-6xl mx-auto mb-12 rounded-lg border border-gray-500 p-2">
          <h2 className="text-2xl font-bold mt-4 text-center">Student List</h2>
          {resultsFound !== null ? (
            <p className="text-md font-bold mb-2">Results Found: {resultsFound}</p>
          ) : (
            <p className="text-md font-bold mb-2">Results Found: {totalCount}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-auto border-collapse border border-gray-700 uppercase">
              <thead>
                <tr className="bg-gray-400 text-sky-900">
                  <th className="border border-sky-900 p-2">Profile</th>
                  <th className="border border-sky-900 p-2">LRN</th>
                  <th className="border border-sky-900 p-2">Name</th>
                  <th className="border border-sky-900 p-2">Parent/Guardian</th>
                  <th className="border border-sky-900 p-2">Parent's Number</th>
                  <th className="border border-sky-900 p-2">Address</th>
                  <th className="border border-sky-900 p-2">Strand</th>
                  <th className="border border-sky-900 p-2">Section</th>
                  <th className="border border-sky-900 p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(students) && students.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center p-4 text-gray-600">
                        ********** No records found **********.
                      </td>
                    </tr>
                ) : (
                  students?.map((s, index) => (
                    <tr key={index} className="hover:bg-gray-300 text-sm bg-gray-200">
                        <td className="border border-gray-400 p-2 text-center">
                            {s.profile ? (
                              <img
                                src={`${API_URL}/${s.profile}?t=${Date.now()}`}
                                alt="Profile"
                                className="w-16 h-16 object-cover rounded-full mx-auto shadow-md border border-gray-100"
                              />
                          ) : (
                            <div className="h-16 w-16 flex items-center justify-center">
                              <UserCircleIcon className="text-gray-400"/>
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-400 p-2 text-center">{s.lrn}</td>
                        <td className="border border-gray-400 p-2">{s.lastname}, {s.firstname} {s.middlename}</td>
                        <td className="border border-gray-400 p-2">{s.parent}</td>
                        <td className="border border-gray-400 p-2">{s.parentnumber}</td>
                        <td className="border border-gray-400 p-2">{s.address}</td>
                        <td className="border border-gray-400 p-2 text-center">{s.strand}</td>
                        <td className="border border-gray-400 p-2 text-center">{s.section}</td>
                        <td className="border border-gray-400 p-2">
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

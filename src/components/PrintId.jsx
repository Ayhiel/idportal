import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { BackwardIcon, ForwardIcon } from '@heroicons/react/24/solid';
import QRCode from 'qrcode';
import { useAuth } from './AuthContext';

export default function PrintId() {
    const location = useLocation();
    const navigate = useNavigate();
    const { role } = useAuth();

    const printRef = useRef();
    const [allStudents, setAllStudents] = useState([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [qrCodes, setQrCodes] = useState({});
    const studentsPerPage = 5;

    const selectedIds = useMemo(() => {
        return location.state?.ids || [];
    }, [location.state?.ids]);

    // Restore the filters/page that were active on the student list (saved by
    // StudentList before navigating here) instead of resetting to a bare list
    const goToStudentsList = useCallback((options) => {
        const savedFilters = localStorage.getItem('student-filters');
        if (savedFilters) {
            try {
                const { search, gradelevel, strand, section, adviser, sort, claimed, page } = JSON.parse(savedFilters);
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                if (gradelevel) params.set('gradelevel', gradelevel);
                if (strand) params.set('strand', strand);
                if (section) params.set('section', section);
                if (adviser) params.set('adviser', adviser);
                if (sort && sort !== 'date_added_desc') params.set('sort', sort);
                if (claimed !== undefined && claimed !== '') params.set('claimed', claimed);
                if (page) params.set('page', page);
                const query = params.toString();
                navigate(query ? `/students?${query}` : "/students", options);
                return;
            } catch (err) {
                console.error('Failed to restore student filters:', err);
            }
        }
        navigate("/students", options);
    }, [navigate]);

    useEffect(() => {
        if (selectedIds.length === 0) {
            goToStudentsList();
        }
    }, [selectedIds, goToStudentsList]);

    useEffect(() => {
        if (selectedIds.length === 0) return;

        const fetchSelectedStudents = async () => {
            try {
                const { data, error } = await supabase
                    .from('tblstudents')
                    .select('*')
                    .in('id', selectedIds)
                    .order('lastname', { ascending: true });

                if (error) throw error;

                setAllStudents(data || []);
            } catch (err) {
                console.error("Failed to fetch selected students", err);
            }
        };

        fetchSelectedStudents();
    }, [selectedIds]);

    const filteredStudents = useMemo(() => {
        return allStudents;
    }, [allStudents]);

    const currentStudents = useMemo(() => {
        const start = pageIndex * studentsPerPage;
        const end = start + studentsPerPage;
        return filteredStudents.slice(start, end);
    }, [filteredStudents, pageIndex]);

    useEffect(() => {
        const maxPage = Math.ceil(filteredStudents.length / studentsPerPage);
        if (pageIndex >= maxPage && pageIndex > 0) setPageIndex(0);
    }, [filteredStudents, studentsPerPage, pageIndex]);

    useEffect(() => {
        let isCancelled = false;

        const generateQRCodes = async () => {
            for (const student of filteredStudents) {
                if (isCancelled) break;
                if (student.lrn && !qrCodes[student.lrn]) {
                    try {
                        const qr = await QRCode.toDataURL(student.lrn, {
                            color: {
                                dark: "#000000",
                                light: "#0000"
                            },
                            margin: .5,
                            scale: 8
                        });

                        if (!isCancelled) {
                            setQrCodes(prev => ({ ...prev, [student.lrn]: qr }));
                        }
                    } catch (err) {
                        console.error('QR generation error:', err);
                    }
                    await new Promise(res => setTimeout(res, 50));
                }
            }
        };

        generateQRCodes();
        return () => { isCancelled = true; };
    }, [filteredStudents, qrCodes]);

    // \n forces a manual line break (rendered via whiteSpace: 'pre-line' below)
    // for the longer strand names so they wrap at a sensible word boundary
    const strandMap = {
        BAE: "Business and Entrepreneurship (BAE)",
        ASSH: "Arts, Social Sciences, and\nHumanities (ASSH)",
        ABM: "Accountancy, Business, and\nManagement (ABM)",
        HUMSS: "Humanities and Social\nSciences (HUMSS)",
        HE: "Home Economics (HE)",
        ICT: "Information and Communication\nTechnology (ICT)",
    };

    // Strand codes are shared across grade 11/12 (ICT, HE) but map to a
    // different track depending on grade level, so the track label needs both.
    const trackMap = {
        g11: { BAE: "Academic Track", ASSH: "Academic Track", ICT: "Technical-Professional Track", HE: "Technical-Professional Track" },
        g12: { ABM: "Academic Track", HUMSS: "Academic Track", ICT: "Technical-Vocational-Livelihood Track", HE: "Technical-Vocational-Livelihood Track" },
    };

    // Strand labels vary a lot in length, so shrink the text (based on its
    // longest line) to keep it inside the fixed-height box
    const strandLabelStyle = (label = '') => {
        const longestLine = label.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
        const style = { whiteSpace: 'pre-line' };
        if (longestLine > 30) return { ...style, fontSize: '7px', lineHeight: '7px' };
        if (longestLine > 22) return { ...style, fontSize: '7.5px', lineHeight: '8px' };
        return { ...style, fontSize: '8px', lineHeight: '9px' };
    };

    return (
        <div className="max-h-[100vh] flex flex-col items-center p-4 mt-16">
           <div className="w-full max-w-[297mm] flex flex-col xl:flex-row lg:items-center lg:gap-4 gap-2 mb-4">
                <div className="w-full max-w-[297mm] flex flex-row justify-end items-center gap-4">
                    <p className="text-sm text-gray-600">
                        Page {pageIndex + 1} of {Math.ceil(filteredStudents.length / studentsPerPage)}
                    </p>
                    <div className="no-print flex flex-row gap-2 justify-center items-center">
                       <button
                            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                            disabled={pageIndex === 0}
                            className="w-14 h-8 flex items-center justify-center bg-gray-400 rounded hover:bg-gray-500 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                            >
                            <BackwardIcon className="w-6 h-6 text-black" />
                            </button>

                            <button
                            onClick={() =>
                                setPageIndex((prev) =>
                                (prev + 1) * studentsPerPage < filteredStudents.length ? prev + 1 : prev
                                )
                            }
                            disabled={(pageIndex + 1) * studentsPerPage >= filteredStudents.length}
                            className="w-14 h-8 flex items-center justify-center bg-gray-400 rounded hover:bg-gray-500 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                            >
                            <ForwardIcon className="w-6 h-6 text-black" />
                        </button>
                    </div>
                    <div className="bg-gray-500 w-1 h-8 rounded-lg"></div>
                    <button
                        onClick={() => window.print()}
                        className="no-print px-4 py-2 bg-sky-900 hover:bg-sky-700 text-white rounded"
                    >
                        Print ID Cards
                    </button>
                    <button
                        onClick={() => goToStudentsList({ replace: true })}
                        className="no-print px-4 py-2 bg-gray-500 hover:bg-gray-400 text-white rounded"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div className="w-full overflow-auto flex justify-center">
                <div
                    id="print-area"
                    ref={printRef}
                    className="w-[300mm] h-[199.9mm] bg-white border border-gray-400 flex flex-col justify-center gap-10"
                >
                    {/* FRONT LAYOUT */}
                        <div className="grid grid-cols-5 justify-items-center shrink-0">
                            {currentStudents.slice(0, 5).map((student, index) => {
                                const middleInitial = student.middlename ? student.middlename.charAt(0) + "." : "";
                                const isSHS = student.gradelevel === "g11" || student.gradelevel === "g12";

                                return (
                                    <div
                                        key={`front-${index}`}
                                        style={{
                                            backgroundImage: `url('${process.env.PUBLIC_URL}/images/${isSHS ? 'updatedFront.png' : 'jhsfront.png'}')`,
                                            width: '57.8mm',
                                            height: '91.6mm'
                                        }}
                                        className="bg-cover bg-center border border-gray-300 p-2 flex flex-col items-center text-xs overflow-hidden"
                                    >
                                        <div
                                        className={`border-2 ${isSHS ? 'border-yellow-500' : 'border-blue-950'} bg-white`}
                                        style={{
                                            width: '26mm',
                                            height: '26mm',
                                            marginTop: isSHS ? '28mm' : '26mm',
                                            overflow: 'hidden'
                                        }}
                                        >
                                        <img
                                            src={student.profile_url}
                                            crossOrigin="anonymous"
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                        </div>

                                        <div className={`flex flex-col items-center text-center ${isSHS ? 'mt-[2.4mm]' : 'mt-[4mm]'}`}>
                                            <div
                                                className={`${isSHS ? 'text-yellow-500' : 'text-blue-1000'} font-extrabold uppercase leading-tight w-full text-center`}
                                                style={{
                                                    fontSize: 'clamp(9pt, 3.5vw, 12.5pt)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {student.lastname}
                                            </div>
                                            <div
                                                className={`${isSHS ? 'text-yellow-500' : 'text-blue-1000'} font-extrabold uppercase`}
                                                style={{ fontSize: '9pt', lineHeight: '14px' }}
                                            >
                                                {student.firstname} {middleInitial}
                                            </div>
                                            <div className={`text-white font-bold mt-1`} style={{ fontSize: '10px', lineHeight: '8px' }}>
                                                LRN: {student.lrn}
                                            </div>
                                        </div>

                                        {isSHS ? (
                                            <div style={{ fontSize: '8px', lineHeight: '10px' }} className="flex flex-col justify-center h-[32px] w-40 text-black mt-5 text-center font-extrabold uppercase">
                                            <p style={strandLabelStyle(strandMap[student.strand])}>{strandMap[student.strand]}</p>
                                            {trackMap[student.gradelevel]?.[student.strand] && (
                                                <p style={{ fontSize: '7px', marginTop: '2px' }} className="text-white font-bold">
                                                    {trackMap[student.gradelevel][student.strand]}
                                                </p>
                                            )}
                                        </div>
                                        ):(
                                            ""
                                        )}
                                        
                                    </div>
                                );
                            })}
                        </div>

                    <div className="h-[1px] bg-black -mt-2"></div>

                    {/* BACK LAYOUT */}
                    <div className="grid grid-cols-5 gap-2 h-[85.6mm] justify-items-center shrink-0">
                        {currentStudents.slice(0, 5).map((student, index) => (
                            <div
                                key={`back-${index}`}
                                style={{
                                    backgroundImage: `url('${process.env.PUBLIC_URL}/images/updatedBack.png')`,
                                    width: '57.8mm',
                                    height: '91.6mm'
                                }}
                                className="bg-cover bg-center p-2 text-xs relative overflow-hidden"
                            >
                                <div
                                    className="h-full w-full flex flex-col justify-center items-center transform rotate-180 uppercase"
                                >
                                    {/* QR Code generated using LRN */}
                                    <img
                                        src={qrCodes[student.lrn]}
                                        crossOrigin="anonymous"
                                        alt="QR Code"
                                        style={{
                                            width: '22.2mm',
                                            height: '22.2mm',
                                            marginBottom: '7mm',
                                            position: 'relative',
                                            bottom: '2.8mm'
                                        }}
                                    />

                                    {/* Parent Name */}
                                    <p style={{ width: '100%', fontSize: '10px', position: 'relative', bottom: '5mm' }} className="text-center">
                                        {student.parent}
                                    </p>

                                    {/* Parent Number */}
                                    <p style={{ width: '100%', fontSize: '10px', position: 'relative', bottom: '3.3mm'  }} className="text-center">
                                        {student.parentnumber}
                                    </p>

                                    {/* Address (admin-only) */}
                                    {role === 'admin' && (
                                        <div
                                            className="text-center whitespace-normal break-words flex items-center justify-center"
                                            style={{
                                                width: '100%',
                                                fontSize: '9px',
                                                lineHeight: '8px',
                                                height: '10mm',
                                                position: 'relative',
                                                bottom: '3.7mm'
                                            }}
                                        >
                                            <p className="w-11/12">{`Brgy. ${student.brgy}, ${student.town}, ${student.province}`}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
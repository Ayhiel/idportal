import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';
import { BackwardIcon, ForwardIcon } from '@heroicons/react/24/solid';
import QRCode from 'qrcode';

export default function PrintId() {
    const API_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
    
    const location = useLocation();
    const navigate = useNavigate();

    const printRef = useRef();
    const [allStudents, setAllStudents] = useState([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [selectedStrand, setSelectedStrand] = useState('');
    const [qrCodes, setQrCodes] = useState({});
    const studentsPerPage = 5;

    // ✅ get the array of selected IDs from SetPrint
    const selectedIds = location.state?.ids || [];

    // ✅ if no IDs were passed, go back to /setprint
    useEffect(() => {
        if (selectedIds.length === 0) {
            navigate("/setprint");
        }
    }, [selectedIds, navigate]);

    // ✅ fetch only the selected students
    useEffect(() => {
        if (selectedIds.length === 0) return;
        axios.post(`${API_URL}/api/students/bulk`, { ids: selectedIds })
            .then(res => setAllStudents(res.data))
            .catch(err => console.error("Failed to fetch selected students", err));
    }, [API_URL, selectedIds]);

    const filteredStudents = useMemo(() => {
        return selectedStrand
            ? allStudents.filter(student => student.strand === selectedStrand)
            : allStudents;
    }, [selectedStrand, allStudents]);

    const currentStudents = useMemo(() => {
        const start = pageIndex * studentsPerPage;
        const end = start + studentsPerPage;
        return filteredStudents.slice(start, end);
    }, [filteredStudents, pageIndex]);

    useEffect(() => {
        const maxPage = Math.ceil(filteredStudents.length / studentsPerPage);
        if (pageIndex >= maxPage && pageIndex > 0) setPageIndex(0);
    }, [filteredStudents, studentsPerPage, pageIndex]);

    useEffect(() => setPageIndex(0), [selectedStrand]);

    // ✅ generate QR codes for only the filtered students
    useEffect(() => {
        let isCancelled = false;

        const generateQRCodes = async () => {
            const newCodes = { ...qrCodes };

            for (const student of filteredStudents) {
                if (isCancelled) break;
                if (student.lrn && !newCodes[student.lrn]) {
                    try {
                        const qr = await QRCode.toDataURL(student.lrn, {
                            color: {
                                dark: "#000000",
                                light: "#0000"
                            },
                            margin: .5,
                            scale: 8
                        });

                        newCodes[student.lrn] = qr;
                        if (!isCancelled) {
                            setQrCodes(prev => ({ ...prev, [student.lrn]: qr }));
                        }
                    } catch (err) {
                        console.error('QR generation error:', err);
                    }
                    await new Promise(res => setTimeout(res, 50)); // small delay
                }
            }
        };

        generateQRCodes();
        return () => { isCancelled = true; };
    }, [filteredStudents, qrCodes]);

    const handleExportPdf = async () => {
        const printArea = document.getElementById("print-area");
        html2canvas(printArea, {
            useCORS: true,
            allowTaint: false,
            scale: 4,
        }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png", 1.0);
            const pdf = new jsPDF("landscape", "mm", "a4");
            pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
            pdf.save("id_cards.pdf");
        });
    };

    const strandMap = {
        ABM: "Accountancy, Business, & Management (ABM)",
        STEM: "Science, Technology, Engineering, & Mathematics (STEM)",
        HUMSS: "Humanities & Social Sciences (HUMSS)",
        GAS: "General Academic Strand (GAS)",
        HE: "Home Economics (HE)",
        AFA: "Agri-Fishery Arts (AFA)",
        ICT: "Information & Communication Technology (ICT)",
        IA: "Industrial Arts (IA)",
    };

    return (
        <div className="max-h-[100vh] flex flex-col items-center p-4 mt-16">
            {/* <button
                onClick={handleExportPdf}
                className="no-print mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
                Export as PDF
            </button> */}

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
                        onClick={() => navigate('/students', { replace: true })}
                        className="no-print px-4 py-2 bg-gray-500 hover:bg-gray-400 text-white rounded"
                    >
                        Back
                    </button>
                </div>
            </div>

            <div className="w-full overflow-auto flex justify-center">
                <div
                    id="print-area"
                    ref={printRef}
                    className="w-[297mm] h-[210mm] bg-white border px-4 pb-14 pt-4 border-gray-400 flex flex-col justify-between"
                >
                    {/* FRONT LAYOUT */}
                        <div className="grid grid-cols-5 gap-2 h-[85.80mm]">
                            {currentStudents.slice(0, 5).map((student, index) => {
                                const middleInitial = student.middlename ? student.middlename.charAt(0) + "." : "";
                                const isSHS = student.gradelevel === "g11" || student.gradelevel === "g12";

                                return (
                                    <div
                                        key={`front-${index}`}
                                        style={{ backgroundImage: `url('${isSHS ? '/images/updatedFront.png' : '/images/jhsfront.png'}')`, width: '54.22mm' }}
                                        className="bg-cover bg-center border border-gray-300 p-2 flex flex-col items-center text-xs"
                                    >
                                        <div
                                        className={`border-2 ${isSHS ? 'border-yellow-500' : 'border-blue-950'} bg-white`}
                                        style={{
                                            width: '25mm',
                                            height: '25mm',
                                            marginTop: isSHS ? '25.5mm' : '24mm',
                                            overflow: 'hidden'
                                        }}
                                        >
                                        <img
                                            src={`${API_URL}/${student.profile}`}
                                            crossOrigin="anonymous"
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                        </div>

                                        {/* <div className="flex flex-col items-center text-center text-yellow-500 leading-tight mt-[1.5mm] space-y-[2px]">
                                            <div className="font-extrabold text-lg uppercase leading-tight">
                                                {student.lastname}
                                            </div>
                                            <div className="font-extrabold uppercase">
                                                {student.firstname} {middleInitial}
                                            </div>
                                            <div className="text-white font-bold" style={{ fontSize: '8px' }}>
                                                LRN: {student.lrn}
                                            </div>
                                        </div> */}

                                        <div className={`flex flex-col items-center text-center ${isSHS ? 'mt-[1.5mm]' : 'mt-[2.5mm]'}`}>
                                            <div className={`${isSHS ? 'text-yellow-500' : 'text-blue-1000'} font-extrabold text-lg uppercase leading-tight`}>
                                                {student.lastname}
                                            </div>
                                            <div className={`${isSHS ? 'text-yellow-500' : 'text-blue-1000'} font-extrabold uppercase`} style={{ fontSize: '8.5pt', lineHeight: '14px' }}>
                                                {student.firstname} {middleInitial}
                                            </div>
                                            <div className={`text-white font-bold mt-1`} style={{ fontSize: '10px', lineHeight: '8px' }}>
                                                LRN: {student.lrn}
                                            </div>
                                        </div>

                                        {isSHS ? (
                                            <div style={{ fontSize: '8px', lineHeight: '10px' }} className="flex flex-col justify-center h-[32px] w-40 text-black mt-3.5 text-center font-extrabold uppercase">
                                            {student.strand === 'AFA' || student.strand === 'HE' || student.strand === 'ICT' || student.strand === 'IA' ? (
                                                <>
                                                    <p>{strandMap[student.strand]}</p>
                                                    <p style={{fontSize: '7px', marginTop: '2px'}} className="text-white font-bold">Technical-Vocational-Livelihood Track</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>{strandMap[student.strand]}</p>
                                                    <p style={{fontSize: '7px', marginTop: '2px'}} className="text-white font-bold">Academic Track</p>
                                                </>
                                            )}
                                        </div>
                                        ):(
                                            ""
                                        )}
                                        
                                    </div>
                                );
                            })}
                        </div>

                    <div className="h-[1px] bg-black"></div>

                    {/* BACK LAYOUT */}
                    <div className="grid grid-cols-5 gap-2 h-[85.80mm]">
                        {currentStudents.slice(0, 5).map((student, index) => (
                            <div
                                key={`back-${index}`}
                                style={{ backgroundImage: "url('/images/updatedBack.png')", width: '54.22mm' }}
                                className="bg-cover bg-center p-2 text-xs relative"
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

                                    {/* Address */}
                                    <div
                                        className="text-center whitespace-normal break-words flex items-center justify-center"
                                        style={{
                                            width: '100%',
                                            fontSize: '9px',
                                            lineHeight: '8px',
                                            height: '10mm',
                                            position: 'relative',
                                            bottom: '4.7mm'
                                        }}
                                    >
                                        <p className="w-11/12">{student.address}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

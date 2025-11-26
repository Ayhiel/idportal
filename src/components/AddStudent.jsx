import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomModal from "./CustomModal";
import Cropper from 'react-easy-crop';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';

// Function to add data to database
export default function AddStudent() {

    const API_URL = process.env.REACT_APP_API_URL;

    const { role } = useAuth();
    const isAdmin = role === 'admin';

    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage, setModalMessage] = useState("");

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const studentid = queryParams.get('id');
    const [originalLrn, setOriginalLRN] = useState('');
  
    const [profileFile, setProfileFile] = useState(null);
    const [originalProfile, setOriginalProfile] = useState('');
    
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({ lrn: '', lastname: '', firstname: '', middlename: '', parent: '', parentnumber: '', brgy: '', town: '', province: '', profile: '', gradelevel:'', strand: '' , section: ''});
    const [msg, setMsg] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState('/images/Profile.png');
    const webcamRef = useRef(null);
    const [useWebcam, setUseWebcam] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [capturedDataUrl, setCapturedDataUrl] = useState('');

    const [crop, setCrop] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [showUploadCrop, setShowUploadCrop] = useState(false);

    const navigate = useNavigate();

    const [isSHS, setIsSHS] = useState(false);
    const [isSenior, setIsSenior] = useState(false);

    // const removeImageBackground = async (imageDataUrl) => {
    // const file = dataURLtoFile(imageDataUrl, 'input.png');
    // const resultBlob = await removeBackground(file); // returns Blob
    // return await blobToDataURL(resultBlob);
    // };

    const blobToDataURL = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };


    useEffect(() => {
        
        if(studentid) {
            axios.get(`${API_URL}/api/students/${studentid}`)
            .then(res => {
                const s = res.data;
                const isSeniorLevel = s.gradelevel === "g11" || s.gradelevel === "g12";
                setIsSenior(isSeniorLevel);

                let brgy = '', town = '', province = '';

                if (s.address) {
                // split by comma, remove leading/trailing spaces
                const parts = s.address.split(',').map(p => p.trim());

                // parts[0] -> "brgy. Pinagkamaligan"
                if (parts[0]) {
                    brgy = parts[0]
                    .replace(/^(brgy\.?|barangay)\s*/i, '') // remove "brgy." or "barangay" (case-insensitive)
                    .trim();
                }

                // parts[1] -> "Calauag"
                if (parts[1]) town = parts[1].trim();

                // parts[2] -> "Quezon"
                if (parts[2]) province = parts[2].trim();
                }

                setForm({
                    lrn: s.lrn || '',
                    lastname: s.lastname || '',
                    firstname: s.firstname || '',
                    middlename: s.middlename || '',
                    parent: s.parent || '',
                    parentnumber: s.parentnumber || '',
                    brgy,
                    town,
                    province,
                    profile: s.profile || '',
                    gradelevel: s.gradelevel || '',
                    strand: s.strand || '',
                    section: s.section || '',
                });
                setOriginalLRN(s.lrn);
                if(s.profile) {
                    setPreviewUrl(`${API_URL}/${s.profile}`);
                }
                setOriginalProfile(s.profile || ''); // Save original filename
            })
            .catch(err => console.error('Failed to fetch student data', err));
        }
    }, [studentid]);

    const videoConstraints = {
         width: { ideal: 1920 },
  height: { ideal: 1080 },
  facingMode: 'environment'
    };

const captureFullRes = () => {
    const video = webcamRef.current?.video;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
};



    const handleCapture = () => {
        const imageSrc = captureFullRes();
        setPreviewUrl(imageSrc);
        setCapturedDataUrl(imageSrc);       // store for confirmation preview
        setShowPreview(true);               // show preview modal
        const file = dataURLtoFile(imageSrc, 'captured.png');
        setProfileFile(file);
        setUseWebcam(false); // optionally hide webcam after capture
    };

    const cancelCapturedImage = () => {
        setCapturedDataUrl('');
        setPreviewUrl('/images/Profile.png'); // or retain old preview if desired
        setProfileFile(null); // clear captured File
        setUseWebcam(true);   // show the webcam again
        setShowPreview(false); // hide the preview image if you're toggling it
    };

    // Convert base64 image to File
    const dataURLtoFile = (dataUrl, filename) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        throw new Error('Invalid data URL passed to dataURLtoFile');
    }

    const arr = dataUrl.split(',');
    const match = arr[0].match(/:(.*?);/);
    if (!match) {
        throw new Error('No MIME type found in data URL');
    }

    const mime = match[1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new File([u8arr], filename, { type: mime });
    };


    // function createCropppedImage(imageSrc, cropPixels, outputSize = 1000) {
    //     return new Promise((resolve, reject) => {
    //         const image = new Image();
    //         image.onload = () => {
    //         const canvas = document.createElement('canvas');
    //         canvas.width = outputSize;
    //         canvas.height = outputSize;
    //         const ctx = canvas.getContext('2d');

    //         // Determine scaling factor to fill outputSize
    //         const scale = outputSize / Math.max(cropPixels.width, cropPixels.height);

    //         const destWidth = cropPixels.width * scale;
    //         const destHeight = cropPixels.height * scale;

    //         // Center the cropped image in the square canvas
    //         const dx = (outputSize - destWidth) / 2;
    //         const dy = (outputSize - destHeight) / 2;

    //         ctx.drawImage(
    //             image,
    //             cropPixels.x,
    //             cropPixels.y,
    //             cropPixels.width,
    //             cropPixels.height,
    //             dx,
    //             dy,
    //             destWidth,
    //             destHeight
    //         );

    //         resolve(canvas.toDataURL('image/png'));
    //         };
    //         image.onerror = reject;
    //         image.src = imageSrc;
    //     });
    // }

function createCropppedImage(imageSrc, cropPixels) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";  // important for file uploads

        image.onload = () => {
            // Use original crop dimensions = MAX resolution possible
            const outputWidth = cropPixels.width;
            const outputHeight = cropPixels.height;

            const canvas = document.createElement("canvas");
            canvas.width = outputWidth;
            canvas.height = outputHeight;

            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                image,
                cropPixels.x,
                cropPixels.y,
                cropPixels.width,
                cropPixels.height,
                0,
                0,
                outputWidth,
                outputHeight
            );

            resolve(canvas.toDataURL("image/png", 1.0));
        };

        image.onerror = reject;
        image.src = imageSrc;
    });
}



    const onCrop = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);


    const checkInternetAccess = async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000); // abort after 3 seconds

            await fetch("https://www.google.com/generate_204", {
            method: "GET",
            mode: "no-cors",
            signal: controller.signal,
            });

            clearTimeout(timeout);
            return true; // successful fetch means online
        } catch (error) {
            return false; // network error, timeout, or blocked
        }
    };


    const getCroppedImage = async () => {
    if (!croppedAreaPixels || !capturedDataUrl) return;

    try {
        const cropped = await createCropppedImage(
            capturedDataUrl,
            croppedAreaPixels,
            1 // or 2 for super sharp
        );

        setPreviewUrl(cropped);
        setProfileFile(
            dataURLtoFile(
                cropped,
                `${form.lastname?.toUpperCase()}_${form.lrn}.png`
            )
        );
        setShowPreview(false);
    } catch (error) {
        console.error("Cropping failed:", error);
    }
};



    const handleCloseModal = () => {
    setModalOpen(false);

    if (isSuccess && studentid) {
        const filters = JSON.parse(localStorage.getItem('student-filters') || '{}');
        const search = filters.search || '';
        const gradelevel = filters.gradelevel || '';
        const strand = filters.strand || '';
        const section = filters.section || '';

        navigate(
        `/students?search=${encodeURIComponent(search)}&gradelevel=${encodeURIComponent(gradelevel)}&strand=${encodeURIComponent(strand)}&section=${encodeURIComponent(section)}`,
        { replace: true }
        );
    }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg('');

        const isEditing = !!studentid;

        try {
            // 🔍 LRN uniqueness check
            if (!isEditing || (isEditing && form.lrn !== originalLrn)) {
            const checkUrl = `${API_URL}/api/check-lrn/${form.lrn}${isEditing ? `?excludeId=${studentid}` : ''}`;
            const checkRes = await axios.get(checkUrl);

            if (checkRes.data.exists) {
                setModalOpen(true);
                setModalTitle("Warning!");
                setModalMessage("The LRN you entered already exists. Please provide a unique LRN.");
                return;
            }
            }
        } catch (err) {
            setModalOpen(true);
            setModalTitle("Error!");
            setModalMessage("Failed to validate or save LRN.");
            return;
        }

        // 🧩 Build form data
        const formData = new FormData();
        for (const key in form) {
            if (key !== 'profile') {
            formData.append(key, form[key] || '');
            }
        }

        if (profileFile) {
            formData.append('profile', profileFile); // new uploaded image
        } else if (originalProfile) {
            formData.append('profile_url', originalProfile); // keep existing
        }

        try {
            if (isEditing) {
            // ✅ Use POST for update
            await axios.post(`${API_URL}/api/students/update/${studentid}`, formData);
            setModalOpen(true);
            setModalTitle("Update Student");
            setModalMessage("Student updated successfully.");
            setIsSuccess(true);
            } else {
            // ✅ Use POST for add
            await axios.post(`${API_URL}/api/students`, formData);
            setModalOpen(true);
            setModalTitle("Add Student");
            setModalMessage("Student added successfully.");
            setForm({
                lrn: '', lastname: '', firstname: '', middlename: '',
                parent: '', parentnumber: '', brgy: '', town: '', province: '', gradelevel: '',
                strand: '', section: '', profile: null
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            setPreviewUrl('/images/Profile.png');
            setIsSuccess(true);
            }
        } catch (err) {
            console.error('Submit error:', err);
            setModalOpen(true);
            setModalTitle("Error!");
            setModalMessage(isEditing ? 'Failed to update student' : 'Failed to add student');
        }
    };


    useEffect(() => {
        const timer = setTimeout(() => {
            setMsg('');
        }, 3000);
        return () => clearTimeout(timer);
    }, [msg]);


  // Fetch all addresses in batches (works even if total rows unknown)
  const fetchAllAddresses = async () => {
    let allData = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const to = from + batchSize - 1;
      const { data, error } = await supabase
        .from('tbladdress')
        .select('province, town, brgy')
        .order('province', { ascending: true })
        .order('town', { ascending: true })
        .order('brgy', { ascending: true })
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      from += batchSize;
    }

    return allData;
  };

  // Load addresses on mount
  useEffect(() => {
    const loadAddresses = async () => {
        try {
            const data = await fetchAllAddresses();

            const clean = data
            .map(a => ({
                province: a.province?.trim(),
                town: a.town?.trim(),
                brgy: a.brgy?.trim()
            }))
            .filter(a => a.province && a.town && a.brgy);

        setAddresses(clean);
        } catch (err) {
            console.error('Error fetching addresses:', err);
        } finally {
            setLoading(false);
        }
    };

    loadAddresses();
  }, []);

  // Build unique lists for selects
  const provinces = [...new Set(addresses.map(a => a.province))];
  const towns = [
    ...new Set(
      addresses
        .filter(a => a.province === form.province)
        .map(a => a.town)
    )
  ];
  const barangays = [
    ...new Set(
      addresses
        .filter(a => a.province === form.province && a.town === form.town)
        .map(a => a.brgy)
    )
  ];

    //   Use to update Input Field
    const updatedField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        return () => {
            if (uploadedImageUrl) {
                URL.revokeObjectURL(uploadedImageUrl);
            }
        };
    }, [uploadedImageUrl]);

  return (
    <div className='py-8 max-h-[100vh] overflow-auto'>
        {loading ? (
        <div className="shadow-lg rounded-xl max-w-xl mx-auto p-4 mt-8">Loading...</div>
        ) : (
            <>
        <div className="shadow-lg rounded-xl max-w-xl mx-auto p-4 mt-8">
            <h1 className="text-2xl text-center font-bold mt-4">Student Information</h1>
            <form onSubmit={handleSubmit} className="w-full mt-8 mb-4">
                <div className='mb-4'>
                    <input 
                        type='text'
                        inputMode='numeric'
                        pattern='[0-9]{12}' // ✅ Ensures 12-digit input on form submission
                        maxLength={12}    // ✅ Prevents user from typing more than 12 characters
                        className="w-full border border-gray-400 p-2 rounded uppercase" 
                        placeholder="LRN" 
                        value={form.lrn} 
                        onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d{0,12}$/.test(value)) {
                            updatedField('lrn', value);
                        }
                        }} 
                        required 
                    />
                    {form.lrn && form.lrn.length !== 12 && (
                        <p className="text-red-500 text-sm">Please enter a 12-digit LRN.</p>
                    )}
                </div>
                <input className="w-full mb-4 border border-gray-400 p-2 rounded uppercase" placeholder="Last Name" value={form.lastname} onChange={e => updatedField('lastname', e.target.value)} required />
                <input className="w-full mb-4 border border-gray-400 p-2 rounded uppercase" placeholder="First Name" value={form.firstname} onChange={e => updatedField('firstname', e.target.value)} required />
                <input className="w-full mb-4 border border-gray-400 p-2 rounded uppercase" placeholder="Middle Name" value={form.middlename} onChange={e => updatedField('middlename', e.target.value)} />
                <input className="w-full mb-4 border border-gray-400 p-2 rounded uppercase" placeholder="Parent/Guardian" value={form.parent} onChange={e => updatedField('parent', e.target.value)} required />
                <div className='mb-4'>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full border border-gray-400 p-2 rounded uppercase"
                        placeholder="Parent's Number"
                        value={form.parentnumber}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Only allow digits and limit to 11 characters
                            if (/^\d{0,11}$/.test(value)) {
                            updatedField('parentnumber', value);
                            }
                        }}
                        required
                    />
                    {form.parentnumber && form.parentnumber.length < 11 && (
                        <p className="text-red-500 text-sm">Mobile number must be 11 digits</p>
                    )}
                </div>
                <select
                    className="w-full mb-4 border border-gray-400 p-2 rounded uppercase"
                    value={form.province}
                    onChange={e => {
                        updatedField('province', e.target.value);
                        updatedField('town', '');
                        updatedField('brgy', '');
   
                    }}
                    required
                    >
                    <option value="">Select Province</option>
                    {provinces.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}

                </select>

                <select
                    className="w-full mb-4 border border-gray-400 p-2 rounded uppercase"
                    value={form.town}
                    onChange={e => {
                        updatedField('town', e.target.value);
                        updatedField('brgy', '');
                        
                    }}
                    required
                    >
                    <option value="">Select Town</option>
                    {towns.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className="w-full mb-4 border border-gray-400 p-2 rounded uppercase"
                    value={form.brgy}
                    onChange={e => updatedField('brgy', e.target.value)}
                    required
                    >
                    <option value="">Select Barangay</option>
                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                    id="gLevelSelect"
                    name="gLevelSelect"
                    value={form.gradelevel}
               
                    className="w-full mb-4 p-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-black uppercase"
                    required
                    onChange={(e) => {
                        const value = e.target.value;
                        updatedField('gradelevel', value);
                        if(value === "g11" || value === "g12") {
                            setIsSHS(true);
                        } else {
                            setIsSHS(false);
                            updatedField('strand', "---");
                            updatedField('section', "---");
                        }
                    }}
                >
                    <option value="">Grade Level</option>
                    <option value="g7">Grade 7</option>
                    <option value="g8">Grade 8</option>
                    <option value="g9">Grade 9</option>
                    <option value="g10">Grade 10</option>
                    <option value="g11">Grade 11</option>
                    <option value="g12">Grade 12</option>
                </select>
                <div className={`${(isSHS || isSenior) ? "block" : "hidden"}`}>
                    <select
                        id="strandSelect"
                        name="strandSelect"
                        value={form.strand}
                        className="w-full mb-4 p-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-black uppercase"
                        onChange={(e) => updatedField('strand', e.target.value)}
                        required={isSHS}
                    >
                        <option value="">Select Strand</option>
                        <option value="ABM">Accountancy, Business, and Management (ABM)</option>
                        {/* <option value="STEM">Science, Technology, Engineering, and Mathematics (STEM)</option> */}
                        <option value="HUMSS">Humanities and Social Sciences (HUMSS)</option>
                        {/* <option value="GAS">General Academic Strand (GAS)</option> */}
                        <option value="HE">Home Economics (HE)</option>
                        {/* <option value="AFA">Agri-Fishery Arts (AFA)</option> */}
                        <option value="ICT">Information and Communication Technology (ICT)</option>
                        {/* <option value="IA">Industrial Arts (IA)</option> */}
                    </select>
                    <select
                        value={form.section}
                        className="w-full mb-4 flex-1 p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        onChange={(e) => updatedField('section', e.target.value)}
                        required={isSHS}
                        >
                        <option value="">Select Section</option>
                        <option value="jnc">JNC</option>
                        <option value="dvt">DVT</option>
                        <option value="etb">ETB</option>
                        <option value="rlb">RLB</option>
                        <option value="cpc">CPC</option>
                        <option value="rbp">RBP</option>
                        <option value="aag">AAG</option>
                    </select>
                </div>
                {isAdmin && (
                    <div className="mb-4 flex flex-row items-center gap-2">
                     {/* Preview Image */}
                    <img
                        src={previewUrl}
                        alt="Profile"
                        className="w-24 h-24 object-cover rounded border border-gray-400"
                    />

                    {/* File Input */}
                    <div className="flex flex-col gap-2 w-full">
                        <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        // capture="environment"
                        onChange={e => {
                            const file = e.target.files[0];
                            if (!file) {
                            setPreviewUrl('/images/Profile.png');
                            return;
                            }
                            const url = URL.createObjectURL(file);
                            setUploadedImageUrl(url);
                            setShowUploadCrop(true);
                        }}
                        className='w-full'
                        />

                        <button
                            type="button"
                            onClick={() => setUseWebcam(true)}
                            className="w-1/2 py-1 bg-gray-600 text-white rounded"
                        >
                            Use Webcam
                        </button>
                    </div>

                    {/* Webcam Modal */}
                    {useWebcam && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                            <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center w-[90vw] max-w-3xl">
                                
                                {/* Wide Webcam Preview */}
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/png"
                                    videoConstraints={videoConstraints}
                                    className="w-full h-auto border rounded"
                                />

                                {/* Buttons */}
                                <div className="flex gap-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={handleCapture}
                                        className="bg-sky-600 text-white px-4 py-2 rounded"
                                    >
                                        Capture
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUseWebcam(false)}
                                        className="bg-gray-400 text-black px-4 py-2 rounded"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {showUploadCrop && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-4 rounded-lg shadow-lg relative w-[400px] h-[480px] flex flex-col items-center">
                            {/* Cropper Area */}
                            <div className="w-full h-[600px] relative">
                                <Cropper
                                image={uploadedImageUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCrop}
                                />
                            </div>

                            {/* Zoom Slider */}
                            <div className="w-full mt-4 px-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Zoom</label>
                                <input
                                type="range"
                                min={1}
                                max={5}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 flex justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!croppedAreaPixels) return;

                                        try {
                                            const cropped = await createCropppedImage(uploadedImageUrl, croppedAreaPixels, 1000);
                                            const finalImage = cropped;

                                            setPreviewUrl(finalImage);
                                            setProfileFile(
                                                dataURLtoFile(
                                                    finalImage,
                                                    `${form.lastname?.toUpperCase()}_${form.lrn}.png`
                                                )
                                            );
                                            setShowUploadCrop(false);
                                            URL.revokeObjectURL(uploadedImageUrl);
                                            setUploadedImageUrl('');
                                        } catch (error) {
                                            console.error("Upload crop failed:", error);
                                        }
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded"
                                >
                                    Use This Photo
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadCrop(false);
                                        setUploadedImageUrl('');
                                        setProfileFile(null);
                                        setPreviewUrl('/images/Profile.png');
                                    }}
                                    className="bg-gray-400 text-black px-4 py-2 rounded"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                    )}

                    {showPreview && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-4 rounded-lg shadow-lg relative w-[400px] h-[480px] flex flex-col items-center">
                            {/* Cropper Area */}
                            <div className="w-full h-[600px] relative">
                                <Cropper
                                image={capturedDataUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // square crop
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCrop}
                                />
                            </div>

                            {/* Zoom Slider */}
                            <div className="w-full mt-4 px-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Zoom</label>
                                <input
                                type="range"
                                min={1}
                                max={5}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 flex justify-center gap-4">
                                <button
                                type="button"
                                onClick={getCroppedImage}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                                >
                                Use This Photo
                                </button>
                                <button
                                type="button"
                                onClick={cancelCapturedImage}
                                className="bg-gray-400 text-black px-4 py-2 rounded"
                                >
                                Retake
                                </button>
                            </div>
                            </div>
                        </div>
                    )}

                </div>
                )}
                <button className="w-full bg-sky-700 hover:bg-sky-600 text-white p-4 mt-4 rounded uppercase" type="submit">{studentid ? 'Update Student' : 'Submit'}</button>
            </form>
        </div>
            </>
        )}
            <CustomModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={modalTitle}
                message={modalMessage}
            />
    </div>
  );
}

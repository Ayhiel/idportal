import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import CustomModal from "./CustomModal";
import Cropper from 'react-easy-crop';
import { supabase } from './supabaseClient';

// Function to add data to database
export default function AddStudent() {
    // Get the user role
    const { role, user } = useAuth();

    // Setting up the signup form
    const [form, setForm] = useState({ lrn: '', lastname: '', firstname: '', middlename: '', parent: '', parentnumber: '', brgy: '', town: '', province: '', profile_url: '', gradelevel:'', strand: '' , section: '', adviser: ''});
    
    // Setting up profile file
    const { data: { publicUrl } } = supabase
        .storage
        .from('id-profile')
        .getPublicUrl('Profile.png');

    const DEFAULT_PROFILE = publicUrl;

    const [profileFile, setProfileFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(DEFAULT_PROFILE);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [originalStudent, setOriginalStudent] = useState(null);

    const [advisers, setAdvisers] = useState([]);
    const [adviserError, setAdviserError] = useState('');

    // Opening Custom Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Image Capture and Cropping
    const webcamRef = useRef(null);
    const fileInputRef = useRef(null);

    const [useWebcam, setUseWebcam] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [capturedDataUrl, setCapturedDataUrl] = useState('');
    const [crop, setCrop] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showUploadCrop, setShowUploadCrop] = useState(false);

    // Setting up address list
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const studentid = queryParams.get('id');
    
    const navigate = useNavigate();

    const [loadingSubmit, setLoadingSubmit] = useState(false);

    const [isSHS, setIsSHS] = useState(false);

    const [brightness, setBrightness] = useState(100);
    const [removingBg, setRemovingBg] = useState(false);

    const BG_REMOVAL_API_URL = process.env.REACT_APP_BG_REMOVAL_API_URL || 'http://localhost:8000';

    // Send the cropped photo to the background-removal service and return
    // a transparent-background PNG data URL (falls back to the original on failure)
    const removeImageBackground = async (dataUrl) => {
        try {
            const sourceBlob = await (await fetch(dataUrl)).blob();
            const formData = new FormData();
            formData.append('file', sourceBlob, 'photo.png');

            const response = await fetch(`${BG_REMOVAL_API_URL}/remove-bg`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error(`Background removal failed (${response.status})`);

            const resultBlob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(resultBlob);
            });
        } catch (err) {
            console.error('Background removal failed, using original photo:', err);
            return dataUrl;
        }
    };

    const MAX_PROFILE_IMAGE_BYTES = 700 * 1024; // 700KB

    // Estimate the decoded byte size of a data URL from its base64 payload
    const dataUrlByteSize = (dataUrl) => {
        const base64 = dataUrl.split(',')[1] || '';
        return Math.ceil((base64.length * 3) / 4);
    };

    // Downscale the (PNG, to keep transparency) image until it fits under
    // maxBytes; leaves it untouched if it's already within the limit
    const compressToMaxSize = async (dataUrl, maxBytes = MAX_PROFILE_IMAGE_BYTES) => {
        if (dataUrlByteSize(dataUrl) <= maxBytes) return dataUrl;

        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });

        let width = image.naturalWidth;
        let height = image.naturalHeight;
        let result = dataUrl;

        for (let attempt = 0; attempt < 10 && dataUrlByteSize(result) > maxBytes; attempt++) {
            width = Math.round(width * 0.85);
            height = Math.round(height * 0.85);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(image, 0, 0, width, height);
            result = canvas.toDataURL('image/png');
        }

        return result; // best effort if still over the limit
    };

    // Convert base64 to File
    const dataURLtoFile = (dataUrl, filename) => {
        const arr = dataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
        return new File([u8arr], filename, { type: mime });
    };


    // Crop image (optionally downscaled to maxDimension on its longest side,
    // so high-resolution mobile camera photos don't produce huge canvases)
    const createCroppedImage = (imageSrc, cropPixels, brightnessValue=100, maxDimension=null) => {
        return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            let targetWidth = cropPixels.width;
            let targetHeight = cropPixels.height;

            if (maxDimension && Math.max(targetWidth, targetHeight) > maxDimension) {
                const scale = maxDimension / Math.max(targetWidth, targetHeight);
                targetWidth = Math.round(targetWidth * scale);
                targetHeight = Math.round(targetHeight * scale);
            }

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            ctx.filter = `brightness(${brightnessValue}%)`;

            ctx.drawImage(
                image,
                cropPixels.x,
                cropPixels.y,
                cropPixels.width,
                cropPixels.height,
                0,
                0,
                targetWidth,
                targetHeight
            );

            ctx.filter = "none";
            resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = reject;
        image.src = imageSrc;
        });
    };

    const fetchAdvisers = useCallback(async () => {
        setLoading(true);
        setAdviserError('');
        try {
            const { data, error } = await supabase
                .from('tbluser')
                .select('id, firstname, lastname, middlename, email, role')
                .ilike('role', 'teacher')
                .order('lastname', { ascending: true }); // Sort by lastname

            if (error) {
                console.error('Error fetching advisers:', error);
                setAdviserError(error.message || 'Failed to load advisers');
                return;
            }

            setAdvisers(data || []);
        } catch (err) {
            console.error('Error:', err);
            setAdviserError(err.message || 'Failed to load advisers');
        } finally {
            setLoading(false);
        }
    }, []);

        // Fetch advisers on component mount
    useEffect(() => {
        fetchAdvisers();
    }, [fetchAdvisers]);

    // Fetch all students during editing
    useEffect(() => {
        if (!studentid) return;

        const fetchStudent = async () => {
        const { data, error } = await supabase
            .from("tblstudents")
            .select("*")
            .eq("id", studentid)
            .limit(1);

        if (error) return console.error("Failed to fetch student:", error);

        const student = data?.[0];

        if (student) {
            const isSenior = student.gradelevel === "g11" || student.gradelevel === "g12";
            setIsSHS(isSenior);
            setOriginalStudent(student);
            setForm({
                ...student,
                lrn: student.lrn || "",
                lastname: student.lastname || "",
                firstname: student.firstname || "",
                middlename: student.middlename || "",
                parent: student.parent || "",
                parentnumber: student.parentnumber || "",
                brgy: student.brgy || "",
                town: student.town || "",
                province: student.province || "",
                gradelevel: student.gradelevel || "",
                strand: student.strand || "",
                section: student.section || "",
                adviser: student.adviser ? String(student.adviser) : "",
                profile_url: student.profile_url || "",
            });

            setPreviewUrl(student.profile_url || DEFAULT_PROFILE);
        }
        };
        fetchStudent();
    }, [studentid, DEFAULT_PROFILE]);


useEffect(() => {
  const loadAddresses = async () => {
    try {
      const response = await fetch("/addresses/ph_addresses.json");
      if (!response.ok) throw new Error("Failed to fetch addresses");

      const data = await response.json();

      const clean = data
        .map(a => ({
          province: a.province?.trim(),
          town: a.town?.trim(),
          brgy: a.brgy?.trim(),
        }))
        .filter(a => a.province && a.town && a.brgy)
        .sort((a, b) => {
          if (a.province.localeCompare(b.province) !== 0) return a.province.localeCompare(b.province);
          if (a.town.localeCompare(b.town) !== 0) return a.town.localeCompare(b.town);
          return a.brgy.localeCompare(b.brgy);
        });

      setAddresses(clean);
    } catch (err) {
      console.error("Error loading address JSON:", err);
    } finally {
      setLoading(false);
    }
  };

  loadAddresses();
}, []);

// Compute unique lists for selects
const provinces = addresses.length
  ? [...new Set(addresses.map(a => a.province))]
  : [];

const towns = addresses.length && form.province
  ? [...new Set(addresses.filter(a => a.province === form.province).map(a => a.town))]
  : [];

const brgy = addresses.length && form.province && form.town
  ? [...new Set(addresses.filter(a => a.province === form.province && a.town === form.town).map(a => a.brgy))]
  : [];

    // Set Capture Resolution
    const videoConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment'
    };

    // Capture full resolution from webcam
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

    // Handle Capture of image
    const handleCapture = () => {
        const dataUrl = captureFullRes();
        if (!dataUrl) return;
        setCapturedDataUrl(dataUrl);
        setPreviewUrl(dataUrl);
        setShowPreview(true);
        setUseWebcam(false);

        const file = dataURLtoFile(dataUrl, `captured_${Date.now()}.png`);
        setProfileFile(file);
    };

    // Handle Cancel Capture
    const cancelCapturedImage = () => {
        setCapturedDataUrl("");
        setPreviewUrl(DEFAULT_PROFILE);
        setProfileFile(null);
        setUseWebcam(true);
        setShowPreview(false);
    };


    // Get the cropped image
    const getCroppedImage = async () => {
        if (!croppedAreaPixels || !capturedDataUrl) return;
        try {
        const cropped = await createCroppedImage(capturedDataUrl, croppedAreaPixels, brightness);
        setShowPreview(false);
        setRemovingBg(true);
        const bgRemoved = await removeImageBackground(cropped);
        const finalImage = await compressToMaxSize(bgRemoved);
        setPreviewUrl(finalImage);
        setProfileFile(dataURLtoFile(finalImage, `${form.lastname}_${form.lrn}.png`));
        } catch (err) {
        console.error("Cropping failed:", err);
        } finally {
        setRemovingBg(false);
        }
    };

    // Set the cropped pixels
    const onCropComplete = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);

    try {
        // Trim current form values
        const currentLastname = form.lastname?.trim();
        const currentLRN = form.lrn?.trim();

        if (studentid) {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!sessionData.session || !user?.id) {
                throw new Error('Your login session expired. Please log in again before updating this student.');
            }
        }

        // Check LRN uniqueness (skip if editing same student)
        const { data: existingStudents, error: existingError } = await supabase
            .from("tblstudents")
            .select("id")
            .eq("lrn", currentLRN)
            .limit(1);

        if (existingError) {
            throw existingError;
        }

        const existing = existingStudents?.[0];

        const existingId = existing?.id?.toString();
        const currentId = studentid?.toString();

        if (existing && existingId !== currentId) {
            setModalOpen(true);
            setModalTitle("The LRN already exists. Please enter a unique LRN");
            // setModalMessage("The LRN already exists. Please enter a unique LRN.");
            setLoadingSubmit(false);
            return;
        }

        let finalProfileUrl = form.profile_url || ''; // Start with existing or empty

        // Helper: generate unique filename
        const generateProfileFilename = (lastname, lrn, extension) => {
            const timestamp = Date.now();
            return `${lastname?.toUpperCase().replace(/\s+/g, '_')}_${lrn}_${timestamp}.${extension}`;
        };

        // Helper: get public URL
        const getPublicUrl = (filename) => {
            const { data } = supabase.storage.from('id-profile').getPublicUrl(filename);
            return data.publicUrl;
        };

        const originalLastname = originalStudent?.lastname?.trim();
        const originalLRN = originalStudent?.lrn?.trim();
        const identityChanged = Boolean(
            studentid &&
            originalStudent &&
            (originalLastname !== currentLastname || originalLRN !== currentLRN)
        );

        // 🔹 CASE 1: User uploaded a new profile image
        if (profileFile) {
        
            // Delete old profile if exists
            if (form.profile_url) {
                await deleteOldProfile(form.profile_url);
            }

            // Upload new profile
            const extension = profileFile.name.split('.').pop();
            const uniqueName = generateProfileFilename(currentLastname, currentLRN, extension);

            const { error: uploadError } = await supabase.storage
                .from('id-profile')
                .upload(uniqueName, profileFile, {
                    upsert: false,
                    contentType: profileFile.type,
                    cacheControl: '31536000' // filenames are unique per upload, so cache for 1 year
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Failed to upload profile image: ' + uploadError.message);
            }

            // Get public URL
            finalProfileUrl = getPublicUrl(uniqueName);
        }
        // 🔹 CASE 2: No new upload, but LRN or lastname changed (rename existing file)
        else if (form.profile_url && identityChanged) {
            
            try {
                const url = new URL(form.profile_url);
                const oldFilePath = decodeURIComponent(
                    url.pathname.replace('/storage/v1/object/public/id-profile/', '')
                );
                const extension = oldFilePath.split('.').pop();
                const newFileName = generateProfileFilename(currentLastname, currentLRN, extension);


                // Download old file
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from('id-profile')
                    .download(oldFilePath);

                if (downloadError) {
                    console.error('Download error:', downloadError);
                    throw downloadError;
                }

                // Upload with new name
                const { error: uploadError } = await supabase.storage
                    .from('id-profile')
                    .upload(newFileName, fileData, {
                        upsert: false,
                        cacheControl: '31536000' // filenames are unique per upload, so cache for 1 year
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw uploadError;
                }

                // Delete old file
                await deleteOldProfile(form.profile_url);

                // Update final URL
                finalProfileUrl = getPublicUrl(newFileName);

            } catch (renameError) {
                console.error('Rename failed:', renameError);
                // Keep old URL if rename fails
                finalProfileUrl = form.profile_url;
            }
        }
        // 🔹 CASE 3: No changes, keep existing URL
        else {
            finalProfileUrl = form.profile_url || '';
        }

        const date_added = new Date().toISOString();

        // Prepare final data
        const studentData = {
            lrn: currentLRN,
            lastname: currentLastname,
            firstname: form.firstname?.trim(),
            middlename: form.middlename?.trim(),
            parent: form.parent?.trim(),
            parentnumber: form.parentnumber?.trim(),
            brgy: form.brgy,
            town: form.town,
            province: form.province,
            gradelevel: form.gradelevel,
            strand: form.strand,
            section: form.section,
            adviser: form.adviser ? Number(form.adviser) : null,
            profile_url: finalProfileUrl, // ✅ This should now have the correct URL
        };


        // 🔹 Update existing student
        if (studentid) {
            const { error: updateError, count: updatedCount } = await supabase
                .from('tblstudents')
                .update(studentData, { count: 'exact' })
                .eq('id', studentid);

            if (updateError) {
                console.error('Update error:', updateError);
                throw updateError;
            }

            if (updatedCount === 0) {
                throw new Error('No student record was updated. Please log in again, then check that your account has permission to edit this student.');
            }

            console.log('Student updated successfully');
        } 
        // 🔹 Insert new student
        else {
            const { error: insertError } = await supabase
                .from('tblstudents')
                .insert([{
                    ...studentData,
                    date_added,
                }]);

            if (insertError) {
                console.error('Insert error:', insertError);
                throw insertError;
            }

            console.log('Student inserted successfully');

            // Reset form after new insert
            setForm({
                lrn: "",
                lastname: "",
                firstname: "",
                middlename: "",
                parent: "",
                parentnumber: "",
                brgy: "",
                town: "",
                province: "",
                gradelevel: "",
                strand: "",
                section: "",
                adviser: "",
                profile_url: "",
            });
            setPreviewUrl(DEFAULT_PROFILE);
            setProfileFile(null);
            setUploadedImageUrl(null);
            setShowUploadCrop(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setOriginalStudent(null);
        }

        setModalOpen(true);
        setModalTitle(studentid ? "Student updated successfully" : "Student added successfully");
        // setModalMessage(studentid ? "Student updated successfully" : "Student added successfully");
        setIsSuccess(true);

    } catch (err) {
        console.error('Submit error:', err);
        setModalOpen(true);
        setModalTitle(err.message || "Failed to save student");
        // setModalMessage(err.message || "Failed to save student");
    } finally {
        setLoadingSubmit(false);
    }
};


    // Delete old profile from storage
// Delete old profile from storage
const deleteOldProfile = async (profileUrl) => {
    if (!profileUrl) return;

    try {
        // Extract filename from URL
        const url = new URL(profileUrl);
        const filePath = decodeURIComponent(
            url.pathname.replace('/storage/v1/object/public/id-profile/', '')
        );
        
        if (!filePath || filePath === 'Profile.png') {
            return; // Don't delete default profile
        }

        const { error } = await supabase.storage
            .from("id-profile")
            .remove([filePath]);

        if (error) {
            console.error("Failed to delete old profile:", error);
        }
        
    } catch (err) {
        console.error("Error removing profile:", err);
    }
};


    // Handle Closing the modal
    const handleCloseModal = () => {
        setModalOpen(false);
        if (isSuccess && studentid && navigate) {
            // Restore the filters that were active before editing (saved by
            // StudentList's handleEdit) so going back doesn't reset the list
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
                    navigate(query ? `/students?${query}` : "/students");
                } catch (err) {
                    console.error('Failed to restore student filters:', err);
                    navigate("/students");
                }
            } else {
                navigate("/students");
            }
        }
        setIsSuccess(false);
    };


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
    <div className='py-8 max-h-[100dvh] overflow-auto'>
        {loading ? (
        <div className="max-w-xl mx-auto h-[100vh] flex flex-col gap-2 items-center justify-center">
            <h4>Loading data... please wait...</h4>
        </div>
        ) : (
            <>
        <div className="sm:shadow-lg rounded-xl max-w-xl mx-auto p-4 mt-8">
            <h1 className="text-2xl text-center font-bold mt-4">Student Information</h1>
            <form onSubmit={handleSubmit} className="w-full mt-8 mb-4">
                <div className='mb-4'>
                    <input 
                        type='text'
                        inputMode='numeric'
                        pattern='[0-9]{12}' // Ensures 12-digit input on form submission
                        maxLength={12}    // Prevents user from typing more than 12 characters
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
   
                    }}
                    required
                    >
                    <option value="">Select Province</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    className="w-full mb-4 border border-gray-400 p-2 rounded uppercase"
                    value={form.town}
                    onChange={e => {
                        updatedField('town', e.target.value);
                        
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
                    {brgy.map(b => <option key={b} value={b}>{b}</option>)}
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
                            updatedField('strand', "");
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
                <div className={`${isSHS ? "block" : "hidden"}`}>
                    <select
                        id="strandSelect"
                        name="strandSelect"
                        value={form.strand}
                        className="w-full mb-4 p-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-black uppercase"
                        onChange={(e) => updatedField('strand', e.target.value)}
                        required={isSHS}
                    >
                        <option value="">Select Strand</option>
                        {form.gradelevel === 'g11' && (
                            <>
                                <option value="BAE">Business and Entrepreneurship (BAE)</option>
                                <option value="ASSH">Arts, Social Sciences, and Humanities (ASSH)</option>
                                <option value="ICT">Information and Communication Technology (ICT)</option>
                                <option value="HE">Home Economics (HE)</option>
                            </>
                        )}
                        {form.gradelevel === 'g12' && (
                            <>
                                <option value="ABM">Accountancy, Business, and Management (ABM)</option>
                                <option value="HUMSS">Humanities and Social Sciences (HUMSS)</option>
                                <option value="ICT">Information and Communication Technology (ICT)</option>
                                <option value="HE">Home Economics (HE)</option>
                            </>
                        )}
                    </select>
                    {/* <select
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
                    </select> */}
                </div>
                <select
                    value={form.adviser}
                    className="w-full mb-4 flex-1 p-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    onChange={(e) => updatedField('adviser', e.target.value)}
                    >
                    <option value="">{loading ? 'Loading advisers...' : 'Adviser'}</option>
                    {!loading && advisers.length === 0 && (
                        <option value="" disabled>
                            {adviserError ? `Unable to load advisers: ${adviserError}` : 'No advisers found'}
                        </option>
                    )}
                    {advisers
                        .map((adviser) => (
                            <option key={adviser.id} value={adviser.id} className='uppercase'>
                            {`${adviser.lastname}, ${adviser.firstname} ${adviser.middlename || ''}`.trim()}
                            </option>
                        ))
                    }
                </select>
                {(role === 'admin' || role === 'teacher') &&
                    <div className="mb-4 flex flex-row items-center gap-2">
                     {/* Preview Image */}
                    <div className="relative w-24 h-24 shrink-0">
                        <img
                            src={previewUrl}
                            alt="Profile"
                            className="w-24 h-24 object-cover rounded border border-gray-400"
                        />
                        {removingBg && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                        )}
                    </div>

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
                            setPreviewUrl(DEFAULT_PROFILE);
                            setProfileFile(null);
                            return;
                            }
                            setProfileFile(file); 
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
                                    onCropComplete={onCropComplete}
                                    style={{
                                        mediaStyle: {
                                        filter: `brightness(${brightness}%)`
                                        }
                                    }}
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

                            <div className="w-full mt-4 px-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                                    Brightness ({brightness}%)
                                </label>
                                <input
                                    type="range"
                                    min={50}
                                    max={200}
                                    step={1}
                                    value={brightness}
                                    onChange={(e) => setBrightness(Number(e.target.value))}
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
                                            const cropped = await createCroppedImage(uploadedImageUrl, croppedAreaPixels, brightness, 1000);
                                            setShowUploadCrop(false);
                                            setRemovingBg(true);
                                            const bgRemoved = await removeImageBackground(cropped);
                                            const finalImage = await compressToMaxSize(bgRemoved);

                                            setPreviewUrl(finalImage);
                                            setProfileFile(
                                                dataURLtoFile(
                                                    finalImage,
                                                    `${form.lastname?.toUpperCase()}_${form.lrn}.png`
                                                )
                                            );
                                            URL.revokeObjectURL(uploadedImageUrl);
                                            setUploadedImageUrl('');
                                        } catch (error) {
                                            console.error("Upload crop failed:", error);
                                        } finally {
                                            setRemovingBg(false);
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
                                        setPreviewUrl(DEFAULT_PROFILE);
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
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                    style={{
                                        mediaStyle: {
                                        filter: `brightness(${brightness}%)`
                                        }
                                    }}
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

                            <div className="w-full mt-4 px-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                                    Brightness ({brightness}%)
                                </label>
                                <input
                                    type="range"
                                    min={50}
                                    max={200}
                                    step={1}
                                    value={brightness}
                                    onChange={(e) => setBrightness(Number(e.target.value))}
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
                }
                
                <button
                    className="w-full bg-sky-700 hover:bg-sky-600 text-white p-4 mt-4 rounded uppercase disabled:opacity-50"
                    type="submit"
                    disabled={loadingSubmit || removingBg}
                >
                    {loadingSubmit ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>{studentid ? 'Updating...' : 'Submitting...'}</span>
                        </div>
                    ) : (
                        studentid ? 'Update Student' : 'Submit'
                    )}
                </button>
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

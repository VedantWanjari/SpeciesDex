import { useEffect, useRef, useState } from 'react';

export default function CaptureView({ onCapture, busy }) {
  const videoRef = useRef(null);
  const uploadRef = useRef(null);
  const [cameraState, setCameraState] = useState('starting');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let activeStream;
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) return setCameraState('unavailable');
      if (typeof window?.confirm === 'function' && !window.confirm('Allow camera access now?')) {
        setCameraState('unavailable');
        return;
      }
      try {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1440 }, height: { ideal: 1920 } },
            audio: false
          });
        } catch {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        setStream(activeStream);
        setCameraState('ready');
      } catch {
        setCameraState('unavailable');
      }
    }
    startCamera();
    return () => activeStream?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => console.warn('Video play error:', err));
    }
  }, [stream, cameraState]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || busy) return;
    const canvas = document.createElement('canvas');
    const maxWidth = 1500;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.86));
  };

  const uploadPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return window.alert('Choose a JPEG, PNG, or WebP photo.');
    if (file.size > 5 * 1024 * 1024) return window.alert('That photo is larger than 5 MB. Choose a smaller one.');
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return <section className="capture-panel">
    <div className="camera-frame">
      {cameraState === 'ready' && <video ref={videoRef} playsInline autoPlay muted />}
      {cameraState !== 'ready' && <div className="camera-fallback"><span>⌁</span><p>{cameraState === 'starting' ? 'Opening your field lens…' : 'Camera unavailable'}</p><small>Choose a wildlife photo from your gallery.</small></div>}
      <div className="viewfinder"><span /><span /><span /><span /></div>
      <div className="camera-copy"><p>SPECIESDEX · FIELD LENS</p><h1>What wild thing<br />did you find?</h1></div>
    </div>
    <div className="capture-actions">
      <button type="button" className="gallery-button" onClick={() => uploadRef.current?.click()} disabled={busy}>▧ <span>Gallery</span></button>
      <button type="button" className={`shutter ${busy ? 'is-busy' : ''}`} onClick={takePhoto} disabled={busy || cameraState !== 'ready'} aria-label="Capture photo"><i /></button>
      <button type="button" className="lens-button" onClick={() => uploadRef.current?.click()} disabled={busy}>＋</button>
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} />
    </div>
    <p className="capture-note">One sighting, one card. More photos add to its field record.</p>
  </section>;
}

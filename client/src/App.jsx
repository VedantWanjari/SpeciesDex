import { useCallback, useEffect, useState } from 'react';
import { captureSpecies, fetchLibrary, deleteLibraryEntry } from './api.js';
import CaptureView from './components/CaptureView.jsx';
import SpeciesCard from './components/SpeciesCard.jsx';
import CardSkeleton from './components/CardSkeleton.jsx';
import LibraryView from './components/LibraryView.jsx';

function deviceId() {
  const existing = localStorage.getItem('speciesdex-device-id');
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem('speciesdex-device-id', next);
  return next;
}

export default function App() {
  const [userId] = useState(deviceId);
  const [tab, setTab] = useState('capture');
  const [library, setLibrary] = useState({ speciesCollected: 0, entries: [] });
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try { setLibrary(await fetchLibrary(userId)); } catch (loadError) { console.warn(loadError.message); } finally { setLoadingLibrary(false); }
  }, [userId]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const handleDeleteEntry = async (gbifKey) => {
    if (!window.confirm('Permanently purge this field record and all associated photos from the database?')) return;
    try {
      await deleteLibraryEntry(userId, gbifKey);
      await loadLibrary();
    } catch (deleteError) {
      console.warn('Failed to delete entry:', deleteError.message);
    }
  };

  const handleCapture = async (imageBase64) => {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const response = await captureSpecies({ imageBase64, userId, deviceMeta: navigator.userAgent.slice(0, 500) });
      setResult({ ...response, imageBase64 });
      await loadLibrary();
    } catch (captureError) {
      setError(captureError.message);
    } finally {
      setBusy(false);
    }
  };

  return <main className="app-shell">
    <nav className="topbar"><button className="brand" onClick={() => setTab('capture')}><span>✦</span> SpeciesDex</button><div><button className={tab === 'capture' ? 'selected' : ''} onClick={() => setTab('capture')}>Capture</button><button className={tab === 'library' ? 'selected' : ''} onClick={() => setTab('library')}>Library <i>{library.speciesCollected}</i></button></div></nav>
    {tab === 'capture' && <>
      <CaptureView onCapture={handleCapture} busy={busy} />
      <section className="result-stage">
        {busy && <CardSkeleton />}
        {error && <div className="error-panel"><b>Field note interrupted</b><p>{error}</p><button onClick={() => setError('')}>Try again</button></div>}
        {!busy && !error && result && <div className="reveal-wrap"><p className={`capture-outcome ${result.newlyGenerated ? 'new' : 'known'}`}>{result.newlyGenerated ? '✦ NEW SPECIES DISCOVERED' : result.alreadyInLibrary ? `↻ FIELD RECORD UPDATED · ${result.photoCount} PHOTOS` : '✦ NEW TO YOUR LIBRARY'}</p><SpeciesCard card={result.card} imageUrl={result.imageBase64} photoCount={result.photoCount} reveal={result.newlyGenerated} /><p className="source-note">ID source: {result.identificationSource === 'vision-llm' ? 'vision identification + GBIF' : 'demo identity fallback + GBIF'}</p></div>}
        {!busy && !error && !result && <div className="starter-copy"><p className="eyebrow">FIELD GUIDE · V1.0</p><h2>Every encounter<br />has a story.</h2><p>Snap a nature photo. We canonicalize its species, calculate its true stats, and file it forever in your collection.</p></div>}
      </section>
    </>}
    {tab === 'library' && <LibraryView library={library} loading={loadingLibrary} onCaptureAgain={() => setTab('capture')} onDeleteEntry={handleDeleteEntry} />}
  </main>;
}


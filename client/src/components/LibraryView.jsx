import { useMemo, useState } from 'react';
import SpeciesCard from './SpeciesCard.jsx';

const RARITIES = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const RANK = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };

export default function LibraryView({ library, loading, onCaptureAgain, onDeleteEntry }) {
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('recent');
  const visible = useMemo(() => [...(library.entries || [])]
    .filter((entry) => filter === 'All' || entry.card.rarityTier === filter)
    .sort((a, b) => sort === 'power' ? b.card.powerScore - a.card.powerScore : sort === 'rarity' ? RANK[b.card.rarityTier] - RANK[a.card.rarityTier] : new Date(b.capturedAt) - new Date(a.capturedAt)), [library.entries, filter, sort]);

  if (loading) return <div className="library-loading">Opening your field archive…</div>;
  if (!library.entries?.length) return <section className="empty-library"><span>✦</span><h1>Your field guide awaits.</h1><p>Spot a plant, insect, or animal to unlock your first collectible card.</p><button type="button" onClick={onCaptureAgain}>Open field lens</button></section>;

  return <section className="library-view">
    <header className="library-header"><div><p className="eyebrow">YOUR COLLECTION</p><h1>{library.speciesCollected} species <em>catalogued</em></h1></div><div className="progress-ring"><b>{library.speciesCollected}</b><span>found</span></div></header>
    <div className="collection-controls"><div className="filter-row">{RARITIES.map((tier) => <button key={tier} onClick={() => setFilter(tier)} className={filter === tier ? 'active' : ''}>{tier}</button>)}</div><label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Latest field note</option><option value="power">Power score</option><option value="rarity">Rarity</option></select></label></div>
    <div className="card-grid">
      {visible.map((entry) => (
        <div key={entry._id} className="library-card-wrapper" style={{ position: 'relative' }}>
          <SpeciesCard card={entry.card} imageUrl={entry.userPhotoUrl} photoCount={entry.photoCount} compact />
          {onDeleteEntry && (
            <button
              type="button"
              className="delete-entry-btn"
              title="Purge record & photo from database"
              onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.speciesCardKey); }}
              style={{
                marginTop: '8px',
                width: '100%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🗑 Purge Record & Photo
            </button>
          )}
        </div>
      ))}
    </div>
    {!visible.length && <p className="no-filter-results">No {filter.toLowerCase()} cards yet. Keep exploring.</p>}
    <p className="privacy-note" style={{ marginTop: '24px', fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>
      🔒 Privacy: Photos are stored privately for your device session. Clicking "Purge Record & Photo" permanently erases all associated data from the database.
    </p>
  </section>;
}


import { useState } from 'react';
import RarityBadge from './RarityBadge.jsx';

const STAT_LABELS = { attack: 'ATK', defense: 'DEF', speed: 'SPD', stamina: 'STA', special: 'SPC' };

export default function SpeciesCard({ card, imageUrl = '', photoCount, reveal = false, compact = false }) {
  const [flipped, setFlipped] = useState(false);
  const displayName = card?.persona?.cardName || card?.commonName || card?.scientificName || 'Unknown Species';
  const imageStyle = imageUrl ? { backgroundImage: `linear-gradient(180deg, rgba(9,28,18,.08), rgba(9,28,18,.72)), url("${imageUrl}")` } : undefined;
  const tier = card?.rarityTier || 'Common';

  return (
    <button type="button" aria-label={`Flip ${displayName} card`} className={`card-scene ${compact ? 'card-compact' : ''} ${reveal ? 'reveal-card' : ''}`} onClick={() => setFlipped((value) => !value)}>
      <article className={`species-card rarity-frame-${tier.toLowerCase()} ${flipped ? 'is-flipped' : ''}`}>
        <section className="card-face card-front">
          <div className="card-topline"><RarityBadge tier={tier} /><span className="card-number">#{card?.gbifKey || 0}</span></div>
          <div className={`card-image ${imageUrl ? 'has-photo' : ''}`} style={imageStyle}>
            {!imageUrl && <span className="card-silhouette">✦</span>}
            <div className="card-image-caption">{card?.commonName || card?.scientificName || 'Unknown'}</div>
          </div>
          <div className="card-title-row">
            <h2>{displayName}</h2>
            <strong>{card?.powerScore ?? 0}</strong>
          </div>
          <p className="card-tagline">{card?.persona?.tagline || ''}</p>
          <div className="move-bar"><span>MOVE</span><b>{card?.persona?.specialMove || 'Nature Calling'}</b></div>
          <span className="flip-hint">tap to inspect</span>
        </section>
        <section className="card-face card-back">
          <div className="card-topline"><span className="science-label">FIELD NOTES</span><RarityBadge tier={tier} /></div>
          <h2>{card?.commonName || card?.scientificName || 'Unknown'}</h2>
          <p className="scientific-name">{card?.scientificName || ''}</p>
          <dl className="taxonomy-grid">
            <div><dt>Kingdom</dt><dd>{card?.kingdom || '—'}</dd></div>
            <div><dt>Class</dt><dd>{card?.className || '—'}</dd></div>
            <div><dt>Rank</dt><dd>{card?.taxonRank || 'Species'}</dd></div>
            <div><dt>Photos</dt><dd>{photoCount ?? 0}</dd></div>
          </dl>
          <div className="stats-list">
            {card?.stats ? Object.entries(card.stats).map(([key, value]) => <div className="stat-row" key={key}><span>{STAT_LABELS[key]}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>) : null}
          </div>
          <p className="backstory">“{card?.persona?.backstory || ''}”</p>
          <span className="flip-hint">tap to return</span>
        </section>
      </article>
    </button>
  );
}


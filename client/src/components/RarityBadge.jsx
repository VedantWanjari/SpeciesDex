export default function RarityBadge({ tier = 'Common' }) {
  return <span className={`rarity-badge rarity-${tier.toLowerCase()}`}>{tier}</span>;
}


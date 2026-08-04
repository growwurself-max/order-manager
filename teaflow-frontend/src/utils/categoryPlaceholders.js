const svgToDataUri = (svg) =>
  `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;

const PLACEHOLDERS = {
  'milk-tea': svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="24" fill="#FFF7ED"/>
      <ellipse cx="100" cy="170" rx="55" ry="8" fill="#FED7AA" opacity="0.6"/>
      <path d="M55 70 C55 50 145 50 145 70 L140 145 C140 158 130 168 100 168 C70 168 60 158 60 145 Z" fill="#F97316"/>
      <path d="M55 70 C55 50 145 50 145 70" stroke="#EA580C" stroke-width="3" fill="none"/>
      <rect x="70" y="85" width="60" height="45" rx="8" fill="#FBBF24" opacity="0.7"/>
      <circle cx="85" cy="100" r="6" fill="#FDE68A" opacity="0.8"/>
      <circle cx="115" cy="110" r="5" fill="#FDE68A" opacity="0.6"/>
      <path d="M145 85 L175 75 L170 95 L145 100 Z" fill="#F97316"/>
      <path d="M80 55 Q100 35 120 55" stroke="#92400E" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>
  `),
  'fruit-tea': svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="24" fill="#F0FDF4"/>
      <ellipse cx="100" cy="170" rx="55" ry="8" fill="#BBF7D0" opacity="0.6"/>
      <path d="M60 75 C60 55 140 55 140 75 L135 148 C135 160 125 168 100 168 C75 168 65 160 65 148 Z" fill="#22C55E"/>
      <path d="M60 75 C60 55 140 55 140 75" stroke="#16A34A" stroke-width="3" fill="none"/>
      <circle cx="85" cy="105" r="10" fill="#F472B6"/>
      <circle cx="110" cy="95" r="8" fill="#FB923C"/>
      <circle cx="100" cy="120" r="7" fill="#A78BFA"/>
      <ellipse cx="95" cy="130" rx="12" ry="6" fill="#4ADE80" opacity="0.5"/>
      <path d="M100 55 L100 40" stroke="#166534" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="108" cy="42" rx="10" ry="6" fill="#22C55E" transform="rotate(30 108 42)"/>
    </svg>
  `),
  slush: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="24" fill="#EFF6FF"/>
      <ellipse cx="100" cy="170" rx="55" ry="8" fill="#BFDBFE" opacity="0.6"/>
      <path d="M58 72 C58 52 142 52 142 72 L138 145 C138 158 128 168 100 168 C72 168 62 158 62 145 Z" fill="#3B82F6"/>
      <path d="M58 72 C58 52 142 52 142 72" stroke="#2563EB" stroke-width="3" fill="none"/>
      <path d="M70 90 Q85 80 100 90 Q115 100 130 90" stroke="#93C5FD" stroke-width="3" fill="none"/>
      <path d="M75 110 Q90 100 105 110 Q120 120 135 110" stroke="#BFDBFE" stroke-width="2" fill="none"/>
      <circle cx="90" cy="125" r="4" fill="#DBEAFE"/>
      <circle cx="115" cy="118" r="3" fill="#DBEAFE"/>
      <rect x="130" y="60" width="8" height="25" rx="4" fill="#EF4444"/>
      <rect x="128" y="55" width="12" height="8" rx="2" fill="#DC2626"/>
    </svg>
  `),
  specialty: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
      <rect width="200" height="200" rx="24" fill="#FAF5FF"/>
      <ellipse cx="100" cy="170" rx="55" ry="8" fill="#E9D5FF" opacity="0.6"/>
      <path d="M62 78 C62 58 138 58 138 78 L133 145 C133 158 123 168 100 168 C77 168 67 158 67 145 Z" fill="#A855F7"/>
      <path d="M62 78 C62 58 138 58 138 78" stroke="#9333EA" stroke-width="3" fill="none"/>
      <path d="M75 95 L100 75 L125 95 L120 130 L80 130 Z" fill="#FDE047" opacity="0.8"/>
      <circle cx="100" cy="105" r="8" fill="#FBBF24"/>
      <path d="M85 60 L90 50 L95 60" stroke="#9333EA" stroke-width="2" fill="none"/>
      <path d="M100 55 L105 42 L110 55" stroke="#9333EA" stroke-width="2" fill="none"/>
      <path d="M115 60 L120 50 L125 60" stroke="#9333EA" stroke-width="2" fill="none"/>
    </svg>
  `),
};

const DEFAULT_PLACEHOLDER = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
    <rect width="200" height="200" rx="24" fill="#F9FAFB"/>
    <ellipse cx="100" cy="170" rx="55" ry="8" fill="#E5E7EB" opacity="0.6"/>
    <path d="M60 75 C60 55 140 55 140 75 L135 148 C135 160 125 168 100 168 C75 168 65 160 65 148 Z" fill="#9CA3AF"/>
    <path d="M60 75 C60 55 140 55 140 75" stroke="#6B7280" stroke-width="3" fill="none"/>
    <rect x="80" y="90" width="40" height="35" rx="6" fill="#D1D5DB"/>
    <circle cx="100" cy="78" r="12" fill="#D1D5DB"/>
  </svg>
`);

export const getCategoryPlaceholder = (category) =>
  PLACEHOLDERS[category] || DEFAULT_PLACEHOLDER;

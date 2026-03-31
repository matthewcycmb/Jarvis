interface JarvisOrbProps {
  amplitude: number;
  triggered: boolean;
  isListening: boolean;
  isCalibrating: boolean;
}

export function JarvisOrb({ amplitude, triggered, isListening, isCalibrating }: JarvisOrbProps) {
  const glow = triggered ? 1 : isListening ? 0.15 + amplitude * 2 : 0.08;
  const cyan = '#67e8f9';
  const cyanDim = '#0e7490';

  return (
    <div className="relative w-[28rem] h-[28rem] flex items-center justify-center">
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-200"
        style={{
          boxShadow: `0 0 ${triggered ? 120 : 20 + amplitude * 80}px ${triggered ? 40 : 5 + amplitude * 20}px rgba(103, 232, 249, ${glow * 0.6})`,
        }}
      />

      <svg viewBox="0 0 300 300" className="w-full h-full" style={{ filter: `drop-shadow(0 0 ${triggered ? 30 : 8}px rgba(103, 232, 249, ${glow}))` }}>
        {/* Outer ring - slow spin */}
        <g className="origin-center" style={{ animation: 'spin-slow 20s linear infinite' }}>
          <circle cx="150" cy="150" r="140" fill="none" stroke={cyan} strokeWidth="1.5" opacity={0.2 + glow * 0.3} />
          {/* Outer dashes */}
          <circle cx="150" cy="150" r="140" fill="none" stroke={cyan} strokeWidth="2.5" opacity={0.4 + glow * 0.4} strokeDasharray="8 24" />
        </g>

        {/* Second ring - medium spin reverse */}
        <g className="origin-center" style={{ animation: 'spin-reverse 15s linear infinite' }}>
          <circle cx="150" cy="150" r="120" fill="none" stroke={cyan} strokeWidth="1" opacity={0.15 + glow * 0.3} />
          <circle cx="150" cy="150" r="120" fill="none" stroke={cyan} strokeWidth="2" opacity={0.3 + glow * 0.5} strokeDasharray="4 12" />
          {/* Tick marks */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 10 * Math.PI) / 180;
            const r1 = 115;
            const r2 = i % 3 === 0 ? 125 : 122;
            return (
              <line
                key={i}
                x1={150 + r1 * Math.cos(angle)}
                y1={150 + r1 * Math.sin(angle)}
                x2={150 + r2 * Math.cos(angle)}
                y2={150 + r2 * Math.sin(angle)}
                stroke={cyan}
                strokeWidth={i % 3 === 0 ? 1.5 : 0.5}
                opacity={0.2 + glow * 0.4}
              />
            );
          })}
        </g>

        {/* Third ring - fast spin */}
        <g className="origin-center" style={{ animation: 'spin-fast 8s linear infinite' }}>
          <circle cx="150" cy="150" r="98" fill="none" stroke={cyan} strokeWidth="1" opacity={0.2 + glow * 0.3} />
          <circle cx="150" cy="150" r="98" fill="none" stroke={cyan} strokeWidth="3" opacity={0.3 + glow * 0.5} strokeDasharray="20 40" />
          {/* Arc segments */}
          <path
            d="M 150 52 A 98 98 0 0 1 248 150"
            fill="none"
            stroke={cyan}
            strokeWidth="2"
            opacity={0.5 + glow * 0.4}
            strokeLinecap="round"
          />
          <path
            d="M 150 248 A 98 98 0 0 1 52 150"
            fill="none"
            stroke={cyan}
            strokeWidth="2"
            opacity={0.5 + glow * 0.4}
            strokeLinecap="round"
          />
        </g>

        {/* Inner ring - slow reverse */}
        <g className="origin-center" style={{ animation: 'spin-slow 12s linear infinite reverse' }}>
          <circle cx="150" cy="150" r="75" fill="none" stroke={cyan} strokeWidth="1.5" opacity={0.2 + glow * 0.4} />
          <circle cx="150" cy="150" r="75" fill="none" stroke={cyan} strokeWidth="2" opacity={0.4 + glow * 0.4} strokeDasharray="6 18" />
        </g>

        {/* Core circle */}
        <circle cx="150" cy="150" r="58" fill="none" stroke={cyan} strokeWidth="1" opacity={0.3 + glow * 0.5} />
        <circle cx="150" cy="150" r="55" fill={`rgba(103, 232, 249, ${triggered ? 0.08 : 0.02})`} stroke={cyan} strokeWidth="0.5" opacity={0.2 + glow * 0.3} />

        {/* J.A.R.V.I.S text */}
        <text
          x="150"
          y="146"
          textAnchor="middle"
          dominantBaseline="central"
          fill={cyan}
          fontSize="16"
          fontWeight="700"
          letterSpacing="4"
          opacity={0.7 + glow * 0.3}
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          J.A.R.V.I.S
        </text>

        {/* Subtitle */}
        {isCalibrating ? (
          <text x="150" y="170" textAnchor="middle" fill={cyan} fontSize="8" opacity={0.5} style={{ fontFamily: 'system-ui' }}>
            CALIBRATING...
          </text>
        ) : triggered ? (
          <text x="150" y="170" textAnchor="middle" fill={cyan} fontSize="9" opacity={0.9} style={{ fontFamily: 'system-ui' }} fontWeight="bold">
            ACTIVATED
          </text>
        ) : isListening ? (
          <text x="150" y="170" textAnchor="middle" fill={cyan} fontSize="8" opacity={0.4} style={{ fontFamily: 'system-ui' }}>
            ONLINE
          </text>
        ) : (
          <text x="150" y="170" textAnchor="middle" fill={cyanDim} fontSize="8" opacity={0.3} style={{ fontFamily: 'system-ui' }}>
            STANDBY
          </text>
        )}

        {/* Corner decorations */}
        {[0, 90, 180, 270].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 150 150)`}>
            <rect x="144" y="18" width="12" height="2" rx="1" fill={cyan} opacity={0.15 + glow * 0.3} />
          </g>
        ))}
      </svg>

      {/* CSS animations */}
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes spin-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .origin-center { transform-origin: 150px 150px; }
      `}</style>
    </div>
  );
}

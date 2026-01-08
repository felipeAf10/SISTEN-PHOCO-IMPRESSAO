import React from 'react';

interface VehicleSvgProps {
    type: 'small' | 'sedan' | 'suv' | 'pickup';
    selectedParts: Set<string>;
    onToggle: (part: string) => void;
    partComplexities?: Record<string, string>;
    dimensions?: Record<string, { w: number, h: number }>;
}

const VehicleSvg: React.FC<VehicleSvgProps> = ({ type, selectedParts, onToggle, partComplexities, dimensions }) => {

    const isSelected = (part: string) => selectedParts.has(part);

    const getPartStyle = (part: string) => {
        const selected = isSelected(part);

        let complexityColor = '#22d3ee'; // cyan-400 default
        if (partComplexities) {
            const level = partComplexities[part];
            if (level === 'Alta') complexityColor = '#facc15'; // yellow-400
            if (level === 'Extrema') complexityColor = '#f87171'; // red-400
        }

        return {
            fill: selected ? `${complexityColor}33` : 'transparent',
            stroke: selected ? complexityColor : 'white',
            strokeWidth: selected ? 2 : 0.8,
            strokeOpacity: selected ? 1 : 0.5,
            filter: selected ? 'url(#glow)' : 'none',
            className: 'transition-all duration-300 cursor-pointer hover:stroke-cyan-300 hover:fill-white/5'
        };
    };

    const getLabel = (part: string, fallback: string, x: number, y: number, align: 'middle' | 'start' | 'end' = 'middle') => {
        if (!isSelected(part)) return null;

        const dim = dimensions?.[part];
        const dimText = dim ? `${dim.w}m x ${dim.h}m` : '';

        return (
            <g pointerEvents="none">
                <text x={x} y={y} fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor={align} opacity="1" style={{ textShadow: '0 0 5px black' }}>
                    {fallback}
                </text>
                {dim && (
                    <text x={x} y={y + 12} fill="#22d3ee" fontSize="9" fontFamily="monospace" textAnchor={align} opacity="1" style={{ textShadow: '0 0 5px black' }}>
                        {dimText}
                    </text>
                )}
            </g>
        );
    };

    // Blueprint Grid Pattern
    const GridPattern = () => (
        <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#27272a" strokeWidth="0.5" />
            </pattern>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
    );

    // LAYOUT CONSTANTS
    // 800x600 ViewBox
    // Top Left: Side View (x: 50, y: 50)
    // Bottom Left: Top View (x: 50, y: 300)
    // Top Right: Front View (x: 550, y: 50)
    // Bottom Right: Rear View (x: 550, y: 300)

    return (
        <svg viewBox="0 0 800 600" className="w-full h-full bg-[#0a0a0a]">
            {/* Background Style */}
            <rect width="100%" height="100%" fill="#09090b" />
            <rect width="100%" height="100%" fill="url(#grid)" opacity="0.4" />

            {/* Blueprint Border */}
            <rect x="10" y="10" width="780" height="580" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.8" />

            {/* Titles */}
            <text x="30" y="35" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" opacity="0.8">VEHICLE BLUEPRINT: {type.toUpperCase()}</text>
            <text x="770" y="35" fill="white" fontSize="12" fontFamily="monospace" textAnchor="end" opacity="0.6">SCALE 1:20</text>

            {/* --- VIEW 1: SIDE VIEW (PROFILE) --- */}
            <g transform="translate(50, 100)">
                <text x="0" y="-20" fill="#52525b" fontSize="10" fontFamily="monospace" letterSpacing="2">SIDE VIEW</text>

                {/* Wheels */}
                <circle cx="80" cy="110" r="25" fill="none" stroke="#52525b" strokeWidth="1" />
                <circle cx="370" cy="110" r="25" fill="none" stroke="#52525b" strokeWidth="1" />

                {/* Body Outline */}
                <path d="M10,80 L10,50 Q100,40 150,30 L250,30 L350,40 L440,50 L440,80 L395,80 Q370,50 345,80 L105,80 Q80,50 55,80 Z" fill="none" stroke="#52525b" strokeWidth="1" strokeDasharray="4,2" />

                {/* Front Fender Parts */}
                <path d="M10,80 L10,50 Q60,45 110,40 L110,80 Q80,50 55,80 L10,80"
                    {...getPartStyle('parachoque_dianteiro')}
                    onClick={() => onToggle('parachoque_dianteiro')} />

                {/* Front Door / Wing */}
                <rect x="110" y="40" width="90" height="40" {...getPartStyle('laterais')} onClick={() => onToggle('laterais')} />

                {/* Rear Door / Wing */}
                <rect x="200" y="40" width="90" height="40" {...getPartStyle('laterais')} onClick={() => onToggle('laterais')} />

                {/* Rear Fender */}
                <path d="M290,40 L350,45 L440,50 L440,80 L395,80 Q370,50 345,80 L290,80 L290,40"
                    {...getPartStyle('laterais')}
                    onClick={() => onToggle('laterais')} />

                {/* Side Label if selected */}
                {isSelected('laterais') && <text x="225" y="100" fill="#22d3ee" fontSize="10" textAnchor="middle">LATERAIS</text>}
            </g>


            {/* --- VIEW 2: TOP VIEW (PLAN) --- */}
            <g transform="translate(50, 320)">
                <text x="0" y="-20" fill="#52525b" fontSize="10" fontFamily="monospace" letterSpacing="2">TOP VIEW</text>

                {/* Center Axis */}
                <line x1="0" y1="60" x2="450" y2="60" stroke="#27272a" strokeDasharray="10,5" strokeWidth="1" />

                {/* Hood */}
                <path d="M20,20 L130,20 L130,100 L20,100 Q10,60 20,20 Z"
                    {...getPartStyle('capo')}
                    onClick={() => onToggle('capo')} />
                {getLabel('capo', 'CAPÔ', 75, 65)}

                {/* Roof */}
                <rect x="130" y="20" width="140" height="80"
                    {...getPartStyle('teto')}
                    onClick={() => onToggle('teto')} />
                {getLabel('teto', 'TETO', 200, 65)}

                {/* Trunk */}
                <path d="M270,20 L380,20 Q390,60 380,100 L270,100 L270,20 Z"
                    {...getPartStyle('porta_malas')}
                    onClick={() => onToggle('porta_malas')} />
                {getLabel('porta_malas', 'MALA', 325, 65)}
            </g>


            {/* --- VIEW 3: FRONT VIEW --- */}
            <g transform="translate(550, 100)">
                <text x="75" y="-20" fill="#52525b" fontSize="10" textAnchor="middle" fontFamily="monospace" letterSpacing="2">FRONT VIEW</text>

                {/* Windshield */}
                <path d="M30,30 L120,30 L130,60 L20,60 Z" fill="none" stroke="#52525b" strokeWidth="1" />

                {/* Bumper Front */}
                <path d="M10,60 L140,60 L140,90 Q75,100 10,90 Z"
                    {...getPartStyle('parachoque_dianteiro')}
                    onClick={() => onToggle('parachoque_dianteiro')} />
                {getLabel('parachoque_dianteiro', 'PARA-CHOQUE', 75, 80)}
            </g>


            {/* --- VIEW 4: REAR VIEW --- */}
            <g transform="translate(550, 320)">
                <text x="75" y="-20" fill="#52525b" fontSize="10" textAnchor="middle" fontFamily="monospace" letterSpacing="2">REAR VIEW</text>

                {/* Rear Window */}
                <path d="M35,30 L115,30 L125,60 L25,60 Z" fill="none" stroke="#52525b" strokeWidth="1" />

                {/* Trunk Line */}
                <line x1="25" y1="60" x2="125" y2="60" stroke="#52525b" />

                {/* Bumper Rear */}
                <path d="M10,60 L140,60 L140,90 Q75,100 10,90 Z"
                    {...getPartStyle('parachoque_traseiro')}
                    onClick={() => onToggle('parachoque_traseiro')} />
                {getLabel('parachoque_traseiro', 'PARA-CHOQUE', 75, 80)}
            </g>

            {/* Reference Dimensions Lines */}
            <line x1="50" y1="230" x2="490" y2="230" stroke="#52525b" strokeWidth="1" />
            <line x1="50" y1="225" x2="50" y2="235" stroke="#52525b" strokeWidth="1" />
            <line x1="490" y1="225" x2="490" y2="235" stroke="#52525b" strokeWidth="1" />
            <text x="270" y="245" fill="#52525b" fontSize="10" textAnchor="middle" fontFamily="monospace">LENGTH REF</text>

        </svg>
    );
};

export default VehicleSvg;



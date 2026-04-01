Guide Complet - Roulette Three.js Production
Problèmes à Corriger

1. Séparations des Numéros

Problème actuel : Les séparations entre cases ne sont pas visibles/correctes
Solution : Ajouter des séparateurs 3D dorés (cylindres fins) entre chaque segment

2. Physique de la Balle

Problème actuel : Balle va partout, pas réaliste
Solution : Trajectoire circulaire contrôlée qui tourne dans le sens opposé à la wheel, puis décélère et tombe sur le numéro cible

Architecture Complète
Stack Technique

Three.js 0.160.0 - Wheel 3D + Balle 3D
Canvas 2D - Overlays (résultat, effets)
React + TypeScript - Components
Backend RNG - Existant (ne pas toucher)

1. RouletteWheel3D.ts - Classe Three.js
   Fichier : frontend/src/lib/casino/three/RouletteWheel3D.ts
   typescriptimport \* as THREE from "three";

// Configuration roulette européenne
const NUMBERS = [
0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const COLORS = {
0: '#0D8A45', // Vert
red: '#C41E3A', // Rouge
black: '#1A1A1A', // Noir
gold: '#D4AF37' // Or
};

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

interface SpinOptions {
targetNumber: number;
duration?: number;
onComplete?: () => void;
}

export class RouletteWheel3D {
private scene: THREE.Scene;
private camera: THREE.PerspectiveCamera;
private renderer: THREE.WebGLRenderer;
private wheelGroup: THREE.Group;
private ball: THREE.Mesh | null = null;
private animationFrameId: number | null = null;
private isSpinning = false;

// Paramètres physiques
private readonly WHEEL_RADIUS = 200;
private readonly WHEEL_HEIGHT = 30;
private readonly BALL_RADIUS = 8;
private readonly BALL_TRACK_RADIUS = 240; // Plus grand que la wheel

constructor(canvas: HTMLCanvasElement) {
// Scene
this.scene = new THREE.Scene();
this.scene.background = new THREE.Color(0x0a1525);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.width / canvas.height,
      0.1,
      2000
    );
    this.camera.position.set(0, 400, 300);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    this.setupLighting();

    // Wheel
    this.wheelGroup = new THREE.Group();
    this.createWheel();
    this.scene.add(this.wheelGroup);

    // Ball
    this.createBall();

    // Initial render
    this.render();

}

private setupLighting(): void {
// Ambient light
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
this.scene.add(ambient);

    // Directional light (top)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0, 500, 200);
    this.scene.add(dirLight);

    // Point light (pour brillance wheel)
    const pointLight = new THREE.PointLight(0xffd700, 0.5, 600);
    pointLight.position.set(0, 200, 0);
    this.scene.add(pointLight);

}

private createWheel(): void {
const segmentAngle = (Math.PI \* 2) / NUMBERS.length;

    // Base cylindrique principale
    const baseGeometry = new THREE.CylinderGeometry(
      this.WHEEL_RADIUS,
      this.WHEEL_RADIUS,
      this.WHEEL_HEIGHT,
      NUMBERS.length,
      1,
      false
    );
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.3,
      roughness: 0.6
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    this.wheelGroup.add(baseMesh);

    // Créer chaque segment avec séparateurs
    for (let i = 0; i < NUMBERS.length; i++) {
      const number = NUMBERS[i];
      const angle = i * segmentAngle;

      // Couleur du segment
      let segmentColor: number;
      if (number === 0) {
        segmentColor = 0x0D8A45; // Vert
      } else if (RED_NUMBERS.includes(number)) {
        segmentColor = 0xC41E3A; // Rouge
      } else {
        segmentColor = 0x1A1A1A; // Noir
      }

      // Segment (plan vertical)
      const segmentShape = new THREE.Shape();
      const innerRadius = this.WHEEL_RADIUS * 0.7;
      segmentShape.moveTo(innerRadius, -this.WHEEL_HEIGHT / 2);
      segmentShape.lineTo(this.WHEEL_RADIUS, -this.WHEEL_HEIGHT / 2);
      segmentShape.lineTo(this.WHEEL_RADIUS, this.WHEEL_HEIGHT / 2);
      segmentShape.lineTo(innerRadius, this.WHEEL_HEIGHT / 2);
      segmentShape.lineTo(innerRadius, -this.WHEEL_HEIGHT / 2);

      const segmentGeometry = new THREE.ExtrudeGeometry(segmentShape, {
        depth: 0.1,
        bevelEnabled: false
      });
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: segmentColor,
        metalness: 0.1,
        roughness: 0.8
      });
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

      // Position et rotation du segment
      segment.rotation.y = angle;
      segment.position.set(0, 0, 0);
      this.wheelGroup.add(segment);

      // **SÉPARATEUR DORÉ** (cylindre fin)
      const separatorGeometry = new THREE.CylinderGeometry(
        2, // Rayon haut
        2, // Rayon bas
        this.WHEEL_HEIGHT + 5, // Hauteur (dépasse un peu)
        8 // Segments
      );
      const separatorMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.gold,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xD4AF37,
        emissiveIntensity: 0.2
      });
      const separator = new THREE.Mesh(separatorGeometry, separatorMaterial);

      // Position du séparateur au bord du segment
      const separatorX = Math.cos(angle) * this.WHEEL_RADIUS;
      const separatorZ = Math.sin(angle) * this.WHEEL_RADIUS;
      separator.position.set(separatorX, 0, separatorZ);
      this.wheelGroup.add(separator);

      // Numéro (texte 3D simplifié avec canvas texture)
      this.createNumberLabel(number, angle);
    }

    // Bord doré extérieur
    const rimGeometry = new THREE.TorusGeometry(
      this.WHEEL_RADIUS + 5,
      8,
      16,
      100
    );
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xD4AF37,
      emissiveIntensity: 0.3
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    this.wheelGroup.add(rim);

}

private createNumberLabel(number: number, angle: number): void {
// Canvas texture pour le numéro
const canvas = document.createElement('canvas');
canvas.width = 64;
canvas.height = 64;
const ctx = canvas.getContext('2d')!;

    // Texte
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Space Grotesk, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 32, 32);

    // Texture
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Position du numéro
    const labelRadius = this.WHEEL_RADIUS * 0.85;
    const x = Math.cos(angle) * labelRadius;
    const z = Math.sin(angle) * labelRadius;
    sprite.position.set(x, this.WHEEL_HEIGHT / 2 + 15, z);
    sprite.scale.set(30, 30, 1);

    this.wheelGroup.add(sprite);

}

private createBall(): void {
const geometry = new THREE.SphereGeometry(this.BALL_RADIUS, 16, 16);
const material = new THREE.MeshStandardMaterial({
color: 0xFFFFFF,
metalness: 0.5,
roughness: 0.2,
emissive: 0xFFFFFF,
emissiveIntensity: 0.1
});
this.ball = new THREE.Mesh(geometry, material);
this.ball.position.set(this.BALL_TRACK_RADIUS, 50, 0);
this.scene.add(this.ball);
}

public async spin(options: SpinOptions): Promise<void> {
if (this.isSpinning) return;
this.isSpinning = true;

    const { targetNumber, duration = 4000, onComplete } = options;

    // Trouver l'index du numéro cible
    const targetIndex = NUMBERS.indexOf(targetNumber);
    if (targetIndex === -1) {
      console.error('Invalid target number:', targetNumber);
      this.isSpinning = false;
      return;
    }

    // Calcul angles
    const segmentAngle = (Math.PI * 2) / NUMBERS.length;
    const targetAngle = -targetIndex * segmentAngle; // Négatif pour rotation horaire
    const initialWheelRotation = this.wheelGroup.rotation.y;
    const totalWheelRotation = initialWheelRotation + (Math.PI * 2 * 4) + targetAngle; // 4 tours + position finale

    // Animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing cubic-bezier(0.25, 0.46, 0.45, 0.94)
      const easeProgress = this.cubicBezier(progress, 0.25, 0.46, 0.45, 0.94);

      // Rotation wheel
      this.wheelGroup.rotation.y = initialWheelRotation +
        (totalWheelRotation - initialWheelRotation) * easeProgress;

      // **BALLE : Rotation OPPOSÉE + descente vers le numéro**
      if (this.ball) {
        // Phase 1 (0-70%) : Balle tourne vite dans le sens opposé
        // Phase 2 (70-100%) : Balle descend et ralentit vers le numéro
        const ballSpeedFactor = progress < 0.7 ? (1 - progress * 0.5) : (1 - progress);
        const ballAngle = -progress * Math.PI * 2 * 8 * ballSpeedFactor; // Sens opposé (négatif)

        // Rayon de la trajectoire : commence large, finit sur la wheel
        const ballRadius = progress < 0.7
          ? this.BALL_TRACK_RADIUS
          : this.BALL_TRACK_RADIUS - (progress - 0.7) / 0.3 * (this.BALL_TRACK_RADIUS - this.WHEEL_RADIUS * 0.85);

        // Hauteur : commence haute, finit basse
        const ballHeight = progress < 0.7
          ? 50
          : 50 - (progress - 0.7) / 0.3 * 45;

        this.ball.position.x = Math.cos(ballAngle) * ballRadius;
        this.ball.position.z = Math.sin(ballAngle) * ballRadius;
        this.ball.position.y = ballHeight;

        // En fin d'animation, positionner exactement sur le numéro
        if (progress >= 0.95) {
          const finalAngle = -targetIndex * segmentAngle;
          const finalRadius = this.WHEEL_RADIUS * 0.85;
          this.ball.position.x = Math.cos(finalAngle) * finalRadius;
          this.ball.position.z = Math.sin(finalAngle) * finalRadius;
          this.ball.position.y = 5;
        }
      }

      this.render();

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        if (onComplete) onComplete();
      }
    };

    animate();

}

private cubicBezier(t: number, p1: number, p2: number, p3: number, p4: number): number {
// Approximation simple cubic bezier
const u = 1 - t;
return 3 _ u _ u _ t _ p2 + 3 _ u _ t _ t _ p4 + t _ t _ t;
}

public render(): void {
this.renderer.render(this.scene, this.camera);
}

public resize(width: number, height: number): void {
this.camera.aspect = width / height;
this.camera.updateProjectionMatrix();
this.renderer.setSize(width, height);
this.render();
}

public dispose(): void {
if (this.animationFrameId) {
cancelAnimationFrame(this.animationFrameId);
}
this.renderer.dispose();
this.scene.traverse((obj) => {
if (obj instanceof THREE.Mesh) {
obj.geometry.dispose();
if (Array.isArray(obj.material)) {
obj.material.forEach(mat => mat.dispose());
} else {
obj.material.dispose();
}
}
});
}
}

2. RouletteWheel.tsx - Component React
   Fichier : frontend/src/components/casino/RouletteWheel.tsx
   typescriptimport React, { useEffect, useRef, useState } from 'react';
   import { RouletteWheel3D } from '@/lib/casino/three/RouletteWheel3D';

interface RouletteWheelProps {
onSpinComplete?: () => void;
targetNumber?: number | null;
isSpinning?: boolean;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
onSpinComplete,
targetNumber,
isSpinning
}) => {
const canvasRef = useRef<HTMLCanvasElement>(null);
const wheelRef = useRef<RouletteWheel3D | null>(null);
const containerRef = useRef<HTMLDivElement>(null);
const [error, setError] = useState<string | null>(null);

// Initialize Three.js
useEffect(() => {
if (!canvasRef.current) return;

    try {
      wheelRef.current = new RouletteWheel3D(canvasRef.current);

      // Handle resize
      const handleResize = () => {
        if (containerRef.current && wheelRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          wheelRef.current.resize(clientWidth, clientHeight);
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
        wheelRef.current?.dispose();
      };
    } catch (err) {
      console.error('Failed to initialize Three.js wheel:', err);
      setError('Impossible de charger la roue 3D');
    }

}, []);

// Trigger spin
useEffect(() => {
if (isSpinning && targetNumber !== null && targetNumber !== undefined && wheelRef.current) {
wheelRef.current.spin({
targetNumber,
duration: 4000,
onComplete: onSpinComplete
});
}
}, [isSpinning, targetNumber, onSpinComplete]);

if (error) {
return (
<div className="flex items-center justify-center h-full">
<p className="text-red-400">{error}</p>
</div>
);
}

return (
<div ref={containerRef} className="relative w-full h-full">
<canvas
ref={canvasRef}
className="w-full h-full"
style={{ display: 'block' }}
/>
</div>
);
};

3. BettingGrid.tsx - Grid SVG
   Fichier : frontend/src/components/casino/BettingGrid.tsx
   typescriptimport React from 'react';

const NUMBERS = [
[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

interface Bet {
type: 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high';
value: number | string;
amount: number;
}

interface BettingGridProps {
bets: Bet[];
onAddBet: (bet: Omit<Bet, 'amount'>) => void;
disabled?: boolean;
chipValue: number;
}

export const BettingGrid: React.FC<BettingGridProps> = ({
bets,
onAddBet,
disabled,
chipValue
}) => {
const handleNumberClick = (num: number) => {
if (disabled) return;
onAddBet({ type: 'number', value: num });
};

const handleOutsideBet = (type: Bet['type'], value: string) => {
if (disabled) return;
onAddBet({ type, value });
};

const getBetAmount = (type: string, value: number | string): number => {
return bets
.filter(b => b.type === type && b.value === value)
.reduce((sum, b) => sum + b.amount, 0);
};

return (
<div className="flex flex-col gap-2 p-4 bg-gray-900/50 rounded-lg">
{/_ Zero _/}
<div
className={`relative h-20 bg-green-700 border-2 border-white/10 rounded cursor-pointer
          hover:scale-105 hover:shadow-cyan-500/50 hover:shadow-lg transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
onClick={() => handleNumberClick(0)} >
<div className="flex items-center justify-center h-full text-3xl font-bold text-white">
0
</div>
{getBetAmount('number', 0) > 0 && (
<ChipDisplay amount={getBetAmount('number', 0)} />
)}
</div>

      {/* Inside numbers */}
      <div className="grid grid-cols-12 gap-1">
        {NUMBERS.map((row, rowIndex) =>
          row.map((num) => {
            const isRed = RED_NUMBERS.includes(num);
            const betAmount = getBetAmount('number', num);

            return (
              <div
                key={num}
                className={`relative h-16 border-2 border-white/10 rounded cursor-pointer
                  hover:scale-105 hover:shadow-cyan-500/50 hover:shadow-lg transition-all
                  ${isRed ? 'bg-red-700' : 'bg-gray-800'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleNumberClick(num)}
              >
                <div className="flex items-center justify-center h-full text-xl font-bold text-white">
                  {num}
                </div>
                {betAmount > 0 && <ChipDisplay amount={betAmount} />}
              </div>
            );
          })
        )}
      </div>

      {/* Outside bets */}
      <div className="grid grid-cols-6 gap-2 mt-2">
        {[
          { type: 'red', label: 'Rouge', color: 'bg-red-700' },
          { type: 'black', label: 'Noir', color: 'bg-gray-800' },
          { type: 'even', label: 'Pair', color: 'bg-blue-700' },
          { type: 'odd', label: 'Impair', color: 'bg-blue-700' },
          { type: 'low', label: '1-18', color: 'bg-purple-700' },
          { type: 'high', label: '19-36', color: 'bg-purple-700' }
        ].map(({ type, label, color }) => {
          const betAmount = getBetAmount(type as Bet['type'], label);

          return (
            <div
              key={type}
              className={`relative h-14 ${color} border-2 border-white/10 rounded cursor-pointer
                hover:scale-105 hover:shadow-cyan-500/50 hover:shadow-lg transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleOutsideBet(type as Bet['type'], label)}
            >
              <div className="flex items-center justify-center h-full text-sm font-bold text-white">
                {label}
              </div>
              {betAmount > 0 && <ChipDisplay amount={betAmount} />}
            </div>
          );
        })}
      </div>
    </div>

);
};

// Chip component
const ChipDisplay: React.FC<{ amount: number }> = ({ amount }) => (

  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-yellow-500 border-4 border-yellow-600 
    flex items-center justify-center shadow-lg animate-bounce-once">
    <span className="text-xs font-bold text-gray-900">{amount}€</span>
  </div>
);

4. RouletteGame.tsx - Orchestrator
   Fichier : frontend/src/components/casino/RouletteGame.tsx
   typescriptimport React, { useState } from 'react';
   import { RouletteWheel } from './RouletteWheel';
   import { BettingGrid } from './BettingGrid';
   import { ResultOverlay } from './ResultOverlay';

interface Bet {
type: 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high';
value: number | string;
amount: number;
}

export const RouletteGame: React.FC = () => {
const [bets, setBets] = useState<Bet[]>([]);
const [chipValue, setChipValue] = useState(10);
const [isSpinning, setIsSpinning] = useState(false);
const [result, setResult] = useState<number | null>(null);
const [balance, setBalance] = useState(1000);

const handleAddBet = (bet: Omit<Bet, 'amount'>) => {
setBets(prev => [...prev, { ...bet, amount: chipValue }]);
};

const handleSpin = async () => {
if (bets.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    try {
      // Call backend
      const response = await fetch('/api/casino/roulette/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets })
      });

      const data = await response.json();

      // Start wheel animation
      setResult(data.result.number);

      // Update balance after animation
      setTimeout(() => {
        setBalance(data.newBalance);
        setIsSpinning(false);
      }, 4500);

    } catch (error) {
      console.error('Spin error:', error);
      setIsSpinning(false);
    }

};

const handleClearBets = () => {
if (!isSpinning) {
setBets([]);
}
};

return (
<div className="flex flex-col lg:flex-row gap-4 p-4 min-h-screen bg-gray-950">
{/_ Left: Wheel _/}
<div className="flex-1 relative">
<div className="aspect-square max-w-2xl mx-auto">
<RouletteWheel
targetNumber={result}
isSpinning={isSpinning}
onSpinComplete={() => console.log('Spin complete')}
/>
</div>
{result !== null && !isSpinning && (
<ResultOverlay number={result} />
)}
</div>

      {/* Right: Betting */}
      <div className="lg:w-96 flex flex-col gap-4">
        {/* Balance */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Balance</div>
          <div className="text-3xl font-bold text-white">{balance}€</div>
        </div>

        {/* Chip Selector */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Valeur jeton</div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 50, 100, 500].map(value => (
              <button
                key={value}
                onClick={() => setChipValue(value)}
                className={`py-2 rounded font-bold transition-all
                  ${chipValue === value
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                disabled={isSpinning}
              >
                {value}€
              </button>
            ))}
          </div>
        </div>

        {/* Betting Grid */}
        <BettingGrid
          bets={bets}
          onAddBet={handleAddBet}
          disabled={isSpinning}
          chipValue={chipValue}
        />

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleClearBets}
            disabled={isSpinning || bets.length === 0}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700
              disabled:cursor-not-allowed text-white font-bold rounded transition-all"
          >
            Effacer
          </button>
          <button
            onClick={handleSpin}
            disabled={isSpinning || bets.length === 0}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700
              disabled:cursor-not-allowed text-white font-bold rounded transition-all"
          >
            {isSpinning ? 'EN COURS...' : 'LANCER'}
          </button>
        </div>

        {/* Bet Summary */}
        {bets.length > 0 && (
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Paris actifs</div>
            <div className="text-2xl font-bold text-white">
              {bets.reduce((sum, bet) => sum + bet.amount, 0)}€
            </div>
          </div>
        )}
      </div>
    </div>

);
};

5. ResultOverlay.tsx - Affichage Résultat
   Fichier : frontend/src/components/casino/ResultOverlay.tsx
   typescriptimport React from 'react';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

interface ResultOverlayProps {
number: number;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({ number }) => {
const getColor = () => {
if (number === 0) return { bg: 'bg-green-600', text: 'text-green-400', glow: 'shadow-green-500/50' };
if (RED_NUMBERS.includes(number)) return { bg: 'bg-red-600', text: 'text-red-400', glow: 'shadow-red-500/50' };
return { bg: 'bg-gray-800', text: 'text-gray-400', glow: 'shadow-gray-500/50' };
};

const colors = getColor();

return (
<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
      animate-fade-in z-10">
<div className={`${colors.bg} ${colors.glow} shadow-2xl rounded-2xl px-12 py-8 
        border-4 border-white/20`}>
<div className="text-center">
<div className="text-6xl font-bold text-white mb-2">
{number}
</div>
<div className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}>
{number === 0 ? 'Zéro' : RED_NUMBERS.includes(number) ? 'Rouge' : 'Noir'}
</div>
</div>
</div>
</div>
);
};

6. Installation & Configuration
   Package.json
   bash# Installer Three.js
   npm install three@0.160.0 --workspace frontend

# Supprimer PixiJS si présent

npm uninstall pixi.js --workspace frontend
CSS Animations (Tailwind)
Ajouter dans tailwind.config.js :
javascriptmodule.exports = {
theme: {
extend: {
animation: {
'fade-in': 'fadeIn 0.3s ease-in',
'bounce-once': 'bounceOnce 0.5s ease-out'
},
keyframes: {
fadeIn: {
'0%': { opacity: '0', transform: 'scale(0.9)' },
'100%': { opacity: '1', transform: 'scale(1)' }
},
bounceOnce: {
'0%, 100%': { transform: 'translateY(0)' },
'50%': { transform: 'translateY(-10px)' }
}
}
}
}
}

Performance & Optimisation
Targets

Init wheel : < 100ms
Spin animation : 60fps stable
Bundle size : +150kb (Three.js core only)

Optimisations

Geometry reuse : Créer les géométries une seule fois
Texture caching : Canvas textures des numéros en cache
Low poly : 37 segments max pour la wheel
Dispose proper : Cleanup memory on unmount

Checklist Final
Avant de déployer :

Wheel tourne smooth 60fps
Séparateurs dorés visibles entre chaque numéro
Balle tourne dans le sens opposé
Balle descend et finit sur le bon numéro
Result overlay s'affiche après animation
Betting grid responsive et cliquable
Backend integration fonctionne
Loading states + error handling
Aucun console.log() en prod
Build size vérifié

Notes Importantes
NE PAS TOUCHER :

Backend routes /api/casino/roulette/\*
Backend RNG logic
Database schema casino_games

CODE PRODUCTION READY :

Error handling propre
Loading states partout
User feedback clair
Pas de debug UI visible

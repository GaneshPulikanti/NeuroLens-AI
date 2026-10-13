import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Activity,
  LocateFixed,
  Sliders,
} from 'lucide-react';
import { VolumeMetadata, LesionMorphometry } from '../types';
import { getSliceImageUrl } from '../services/api';

interface MedicalImageViewerProps {
  studyId: string;
  mriMeta: VolumeMetadata;
  hasLesionMask: boolean;
  lesionMetrics: LesionMorphometry | null;
  selectedRoiName?: string | null;
}

export const MedicalImageViewer: React.FC<MedicalImageViewerProps> = ({
  studyId,
  mriMeta,
  hasLesionMask,
  lesionMetrics,
}) => {
  // Navigation & Plane
  const [activePlane, setActivePlane] = useState<'axial' | 'coronal' | 'sagittal'>('axial');
  const [sliceIndex, setSliceIndex] = useState<number>(45);

  // Display & Contrast Controls
  const [preset, setPreset] = useState<string>('brain');
  const [showLesion, setShowLesion] = useState<boolean>(true);
  const [lesionOpacity, setLesionOpacity] = useState<number>(0.6);
  const [showRois, setShowRois] = useState<boolean>(false);
  const [roiOpacity, setRoiOpacity] = useState<number>(0.4);
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(true);

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse coordinate tracker for crosshair
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Dimensions for active plane
  const maxSlice =
    activePlane === 'axial'
      ? mriMeta.dimensions.z_axial - 1
      : activePlane === 'coronal'
      ? mriMeta.dimensions.y_coronal - 1
      : mriMeta.dimensions.x_sagittal - 1;

  // Set default slice to middle or lesion center
  useEffect(() => {
    if (lesionMetrics?.center_of_gravity_voxel) {
      const cog = lesionMetrics.center_of_gravity_voxel;
      if (activePlane === 'axial') setSliceIndex(Math.round(cog[2]));
      else if (activePlane === 'coronal') setSliceIndex(Math.round(cog[1]));
      else setSliceIndex(Math.round(cog[0]));
    } else {
      setSliceIndex(Math.floor(maxSlice / 2));
    }
  }, [activePlane, maxSlice]);

  const sliceUrl = getSliceImageUrl(studyId, activePlane, sliceIndex, {
    preset,
    showLesion: hasLesionMask && showLesion,
    lesionOpacity,
    showRois,
    roiOpacity,
  });

  // Calculate MNI mm coordinate from current slice & active plane
  const computeMniCoord = () => {
    const affine = mriMeta.affine;
    if (activePlane === 'axial') {
      const z_mm = affine[2][2] * sliceIndex + affine[2][3];
      return `Z = ${z_mm.toFixed(1)} mm`;
    } else if (activePlane === 'coronal') {
      const y_mm = affine[1][1] * sliceIndex + affine[1][3];
      return `Y = ${y_mm.toFixed(1)} mm`;
    } else {
      const x_mm = affine[0][0] * sliceIndex + affine[0][3];
      return `X = ${x_mm.toFixed(1)} mm`;
    }
  };

  // Orientation labels based on plane
  const getOrientationLabels = () => {
    if (activePlane === 'axial') {
      return { top: 'Anterior (A)', bottom: 'Posterior (P)', left: 'Right (R)', right: 'Left (L)' };
    } else if (activePlane === 'coronal') {
      return { top: 'Superior (S)', bottom: 'Inferior (I)', left: 'Right (R)', right: 'Left (L)' };
    } else {
      return { top: 'Superior (S)', bottom: 'Inferior (I)', left: 'Anterior (A)', right: 'Posterior (P)' };
    }
  };

  const labels = getOrientationLabels();

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const jumpToLesion = () => {
    if (lesionMetrics?.center_of_gravity_voxel) {
      const cog = lesionMetrics.center_of_gravity_voxel;
      if (activePlane === 'axial') setSliceIndex(Math.round(cog[2]));
      else if (activePlane === 'coronal') setSliceIndex(Math.round(cog[1]));
      else setSliceIndex(Math.round(cog[0]));
    }
  };

  return (
    <div className="flex flex-col bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      {/* Upper Control Bar: Planes, Presets, and View Tools */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2.5">
        {/* Row 1: Plane Tabs & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Plane Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'axial', label: 'Top (Axial)' },
              { id: 'coronal', label: 'Front (Coronal)' },
              { id: 'sagittal', label: 'Side (Sagittal)' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActivePlane(id as any)}
                className={`px-3 py-1 rounded font-medium text-xs transition-all ${
                  activePlane === id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Window / Level Presets */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium text-[11px] mr-1">Window:</span>
            {['brain', 'stroke', 'full'].map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-all border ${
                  preset === p
                    ? 'bg-slate-800 border-blue-500 text-blue-400 font-semibold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Zoom and Crosshair Tools */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setShowCrosshairs(!showCrosshairs)}
              className={`p-1.5 rounded ${
                showCrosshairs ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Toggle Crosshairs"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3.5))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.6))}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Overlays and Opacity Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          {/* Lesion Overlay Toggle & Slider */}
          {hasLesionMask ? (
            <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setShowLesion(!showLesion)}
                className={`flex items-center space-x-1.5 font-medium ${
                  showLesion ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {showLesion ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Highlight Stroke (Red)</span>
              </button>
              {showLesion && (
                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={lesionOpacity}
                    onChange={(e) => setLesionOpacity(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-slate-700 rounded cursor-pointer accent-red-500"
                  />
                  <span className="font-mono text-[10px] text-slate-400 w-7">
                    {Math.round(lesionOpacity * 100)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-500 text-[11px]">No Stroke Mask Attached</span>
          )}

          {/* ROI Atlas Toggle & Slider */}
          <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setShowRois(!showRois)}
              className={`flex items-center space-x-1.5 font-medium ${
                showRois ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              {showRois ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Speech Zones (Atlas)</span>
            </button>
            {showRois && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={roiOpacity}
                  onChange={(e) => setRoiOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-700 rounded cursor-pointer accent-blue-500"
                />
                <span className="font-mono text-[10px] text-slate-400 w-7">
                  {Math.round(roiOpacity * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Jump to Lesion Center Button */}
          {hasLesionMask && lesionMetrics?.center_of_gravity_voxel && (
            <button
              onClick={jumpToLesion}
              className="flex items-center space-x-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 border border-red-500/50 text-red-200 rounded-lg text-[11px] font-medium transition-all"
            >
              <LocateFixed className="w-3 h-3 text-red-400" />
              <span>Target Stroke Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Medical Canvas Viewport (Fixed Height, Letterboxed, No Overflow) */}
      <div
        className="relative h-[480px] bg-black flex items-center justify-center overflow-hidden cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Anatomical Spatial Edge Badges (Outside the brain circle, never overlapping) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-900/80 backdrop-blur rounded text-[10px] font-mono tracking-wider text-slate-300 border border-slate-800 pointer-events-none z-10">
          {labels.top}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-900/80 backdrop-blur rounded text-[10px] font-mono tracking-wider text-slate-300 border border-slate-800 pointer-events-none z-10">
          {labels.bottom}
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-900/80 backdrop-blur rounded text-[10px] font-mono tracking-wider text-slate-300 border border-slate-800 pointer-events-none z-10">
          {labels.left}
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-900/80 backdrop-blur rounded text-[10px] font-mono tracking-wider text-slate-300 border border-slate-800 pointer-events-none z-10">
          {labels.right}
        </div>

        {/* Slice Image Container with Zoom & Pan */}
        <div
          className="relative transition-transform duration-75 ease-out flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <img
            src={sliceUrl}
            alt={`MRI ${activePlane} slice ${sliceIndex}`}
            className="max-h-[420px] max-w-[420px] w-auto h-auto object-contain medical-canvas rounded shadow-lg"
            draggable={false}
          />

          {/* Interactive Dynamic Crosshairs */}
          {showCrosshairs && cursorPos && (
            <>
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-cyan-400/40 pointer-events-none"
                style={{ left: `${cursorPos.x - pan.x}px` }}
              />
              <div
                className="absolute left-0 right-0 h-[1px] bg-cyan-400/40 pointer-events-none"
                style={{ top: `${cursorPos.y - pan.y}px` }}
              />
            </>
          )}
        </div>
      </div>

      {/* Dedicated Clean Telemetry HUD Strip (Below Canvas, 100% visible, no overlay) */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
        <div className="flex items-center space-x-3">
          <span className="text-cyan-400 font-semibold flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5" />
            <span>{computeMniCoord()}</span>
          </span>
          <span className="text-slate-500">•</span>
          <span>
            Slice: <strong className="text-white">{sliceIndex}</strong> / {maxSlice}
          </span>
          <span className="text-slate-500">•</span>
          <span>
            Voxel: <span className="text-white">{mriMeta.voxel_dims_mm.join('×')} mm</span>
          </span>
        </div>

        {lesionMetrics && (
          <div className="flex items-center space-x-2 text-red-400 font-semibold">
            <span>Lesion: {lesionMetrics.volume_cm3} cm³</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-normal">{lesionMetrics.laterality_label}</span>
          </div>
        )}
      </div>

      {/* Bottom Slice Navigation Slider Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-3">
        <button
          onClick={() => setSliceIndex((s) => Math.max(0, s - 1))}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Previous Slice"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-slate-400 w-16 text-center select-none">
          {sliceIndex} / {maxSlice}
        </span>

        <input
          type="range"
          min={0}
          max={maxSlice}
          value={sliceIndex}
          onChange={(e) => setSliceIndex(parseInt(e.target.value))}
          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />

        <button
          onClick={() => setSliceIndex((s) => Math.min(maxSlice, s + 1))}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Next Slice"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

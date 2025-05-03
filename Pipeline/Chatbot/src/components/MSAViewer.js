import React, { useMemo, useRef, useState, useEffect } from 'react';
import './MSAViewer.css';

// ClustalX color scheme for amino acids
const AA_COLORS = {
  G: '#001219', P: '#005f73', S: '#54478c', T: '#442220',
  H: '#34a0a4', K: '#52b69a', R: '#76c893', 
  F: '#99d98c', W: '#b5e48c', Y: '#d9ed92', 
  I: '#01200f', L: '#577590', M: '#4d908e', V: '#43aa8b',
  A: '#90be6d', C: '#f9c74f', D: '#f9844a', E: '#f8961e',
  N: '#f3722c', Q: '#ae2012',
  '-': '#222',
  X: '#AAA', B: '#AAA', Z: '#AAA',
};

function parseFastaAlignment(fasta) {
  const names = [];
  const seqs = [];
  let current = '';
  fasta.split(/\r?\n/).forEach(line => {
    if (line.startsWith('>')) {
      names.push(line.slice(1).trim());
      if (current) seqs.push(current);
      current = '';
    } else {
      current += line.trim();
    }
  });
  if (current) seqs.push(current);
  return { names, seqs: seqs.map(seq => seq.toUpperCase()) };
}

function calcConservation(seqs) {
  // Returns array of conservation scores (0-1) for each column
  if (!seqs.length) return [];
  const n = seqs[0].length;
  const scores = [];
  for (let i = 0; i < n; ++i) {
    const counts = {};
    for (const seq of seqs) {
      const aa = seq[i];
      counts[aa] = (counts[aa] || 0) + 1;
    }
    const max = Math.max(...Object.values(counts));
    scores.push(max / seqs.length);
  }
  return scores;
}

const CELL_SIZE = 32;
const NAME_WIDTH = 250;
const TOP_HEIGHT = 40;
const BAR_HEIGHT = 120;


const MSAViewer = ({ fastaAlignment }) => {
  const { names, seqs } = useMemo(() => parseFastaAlignment(fastaAlignment), [fastaAlignment]);
  const conservation = useMemo(() => calcConservation(seqs), [seqs]);
  const [hoverCol, setHoverCol] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, value: 0, col: 0 });
  const scrollRef = useRef();
  const dragState = useRef({ dragging: false, lastX: 0 });

  // Drag-to-scroll logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState.current.dragging) return;
      e.preventDefault();
      const dx = dragState.current.lastX - e.clientX;
      scrollRef.current.scrollLeft += dx;
      dragState.current.lastX = e.clientX;
    };
    const handleMouseUp = () => {
      dragState.current.dragging = false;
      document.body.style.cursor = '';
    };
    if (dragState.current.dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.current.dragging]);

  if (!names.length || !seqs.length) return <div>No alignment data.</div>;
  const nCols = seqs[0].length;

  // Mouse down for drag
  const onMouseDown = (e) => {
    dragState.current.dragging = true;
    dragState.current.lastX = e.clientX;
    document.body.style.cursor = 'grabbing';
  };
  // Touch events
  const onTouchStart = (e) => {
    dragState.current.dragging = true;
    dragState.current.lastX = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (!dragState.current.dragging) return;
    const dx = dragState.current.lastX - e.touches[0].clientX;
    scrollRef.current.scrollLeft += dx;
    dragState.current.lastX = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    dragState.current.dragging = false;
  };

  // For column highlighting
  const highlightCol = idx => setHoverCol(idx);
  const unhighlightCol = () => setHoverCol(null);

  // Tooltip handlers for conservation bars
  const handleBarMouseEnter = (i, e) => {
    setHoverCol(i);
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      show: true,
      x: rect.x + rect.width / 2,
      y: rect.y - 10,
      value: conservation[i],
      col: i + 1
    });
  };
  const handleBarMouseLeave = () => {
    setHoverCol(null);
    setTooltip({ show: false });
  };

  // Conservation chart constants
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const LEFT_MARGIN = 60; // for y-axis and label
  const chartWidth = nCols * CELL_SIZE;
  const chartHeight = BAR_HEIGHT;
  const axisLabelOffset = 40;
  const barColor = (score) => {
    const low = [67, 170, 139];
    const high = [84, 71, 140];
    const c = low.map((l, i) => Math.round(l + (high[i] - l) * score));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };

  return (
    <div className="msa-viewer" style={{ background: '#111', color: '#fff', borderRadius: 8, padding: 16, overflow: 'hidden' }}>
      {/* Conservation Bar Chart + Alignment Table in one scrollable area */}
      <div style={{ display: 'flex', flexDirection: 'row', marginTop: 8 }}>
        {/* Sequence Names */}
        <div style={{ width: NAME_WIDTH, flexShrink: 0 }}>
          <div style={{ height: BAR_HEIGHT + TOP_HEIGHT }} />
          {names.map((name, i) => (
            <div
              key={i}
              style={{ height: CELL_SIZE, display: 'flex', alignItems: 'center', fontWeight: i === 0 ? 'bold' : 'normal', color: i === 0 ? '#fff' : '#eee', fontSize: 14, borderBottom: '1px solid #222', cursor: 'ew-resize' }}
              title={name}
            >
              {name}
            </div>
          ))}
        </div>
        <div
          ref={scrollRef}
          style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid #222', background: '#181818', maxWidth: 'calc(100vw - 2*220px)', cursor: dragState.current.dragging ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Conservation Bar Chart */}
          <div style={{ position: 'relative', height: chartHeight, width: chartWidth + LEFT_MARGIN }}>
            <svg width={chartWidth + LEFT_MARGIN} height={chartHeight} style={{ display: 'block', background: '#111' }}>
              {/* Y-axis grid lines and ticks */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={LEFT_MARGIN}
                    x2={chartWidth + LEFT_MARGIN}
                    y1={chartHeight - tick * (chartHeight - 10)}
                    y2={chartHeight - tick * (chartHeight - 10)}
                    stroke="#1b4965"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={LEFT_MARGIN - 10}
                    y={chartHeight - tick * (chartHeight - 10) + 4}
                    fontSize={12}
                    fill="#fff"
                    textAnchor="end"
                    fontWeight="bold"
                  >
                    {tick}
                  </text>
                </g>
              ))}
              {/* Y-axis label */}
              <text
                x={18}
                y={chartHeight / 2}
                fontSize={16}
                fill="#fff"
                textAnchor="middle"
                transform={`rotate(-90 18,${chartHeight / 2})`}
                fontWeight="bold"
              >
                Conservation
              </text>
              {/* Bars */}
              {conservation.map((score, i) => (
                <rect
                  key={i}
                  x={LEFT_MARGIN + i * CELL_SIZE}
                  y={chartHeight - score * (chartHeight - 10)}
                  width={CELL_SIZE - 2}
                  height={score * (chartHeight - 10)}
                  fill={barColor(score)}
                  opacity={hoverCol === i ? 1 : 0.85}
                  onMouseEnter={e => handleBarMouseEnter(i, e)}
                  onMouseLeave={handleBarMouseLeave}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </svg>
            {/* Tooltip */}
            {tooltip.show && (
              <div
                style={{
                  position: 'fixed',
                  left: tooltip.x,
                  top: tooltip.y,
                  background: '#222',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 14,
                  pointerEvents: 'none',
                  zIndex: 1000,
                  border: '1px solid #888',
                  boxShadow: '0 2px 8px #000a',
                }}
              >
                <b>Col {tooltip.col}</b>: {tooltip.value.toFixed(3)}
              </div>
            )}
          </div>
          {/* Column numbers */}
          <div style={{ display: 'flex', flexDirection: 'row', height: TOP_HEIGHT, width: chartWidth, marginLeft: LEFT_MARGIN }}>
            {Array.from({ length: nCols }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: CELL_SIZE,
                  minWidth: CELL_SIZE,
                  maxWidth: CELL_SIZE,
                  height: TOP_HEIGHT,
                  minHeight: TOP_HEIGHT,
                  maxHeight: TOP_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: hoverCol === i ? '#1b4965' : '#fff',
                  background: hoverCol === i ? '#222' : 'transparent',
                  borderBottom: '1px solid #222',
                  borderRight: '1px solid #222',
                  cursor: 'ew-resize',
                  overflow: 'hidden',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={() => highlightCol(i)}
                onMouseLeave={unhighlightCol}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
            ))}
          </div>
          {/* Alignment rows */}
          {seqs.map((seq, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', flexDirection: 'row', width: chartWidth, marginLeft: LEFT_MARGIN }}>
              {Array.from(seq).map((aa, colIdx) => {
                // Ensure only a single uppercase character, fallback to 'X' if not valid
                const residue = (aa && typeof aa === 'string' && aa.trim().length === 1) ? aa.toUpperCase() : 'X';
                return (
                  <div
                    key={colIdx}
                    style={{
                      width: CELL_SIZE,
                      minWidth: CELL_SIZE,
                      maxWidth: CELL_SIZE,
                      height: CELL_SIZE,
                      minHeight: CELL_SIZE,
                      maxHeight: CELL_SIZE,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: rowIdx === 0 ? 'bold' : 'normal',
                      color: '#fff',
                      background: hoverCol === colIdx ? '#1b4965' : (AA_COLORS[residue] || '#444'),
                      borderRight: '1px solid #222',
                      borderBottom: '1px solid #222',
                      cursor: 'ew-resize',
                      transition: 'background 0.1s',
                      overflow: 'hidden',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={() => highlightCol(colIdx)}
                    onMouseLeave={unhighlightCol}
                    title={`Row: ${names[rowIdx]}\nCol: ${colIdx + 1}\nAA: ${residue}`}
                  >
                    {residue}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MSAViewer; 
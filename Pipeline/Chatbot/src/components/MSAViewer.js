import React, { useMemo, useRef, useState, useEffect } from 'react';
import { FixedSizeGrid, FixedSizeList } from 'react-window';
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
const NAME_WIDTH = 200;
const TOP_HEIGHT = 40;
const BAR_HEIGHT = 120;
const SCROLLBAR_SIZE = 15; // Approximate size of scrollbars


const MSAViewer = ({ fastaAlignment }) => {
  const { names, seqs } = useMemo(() => parseFastaAlignment(fastaAlignment), [fastaAlignment]);
  const conservation = useMemo(() => calcConservation(seqs), [seqs]);
  const [hoverCol, setHoverCol] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, value: 0, col: 0 });

  // Refs for react-window components and scrollable divs
  const gridRef = useRef(null);
  const namesListRef = useRef(null);
  const columnNumbersListRef = useRef(null);
  const conservationChartContainerRef = useRef(null);
  const msaViewerContainerRef = useRef(null);

  // State for dimensions of the viewer
  const [viewerDimensions, setViewerDimensions] = useState({ width: 0, height: 600 }); // Default height

  // Scroll state, driven by the main grid
  const [sharedScrollLeft, setSharedScrollLeft] = useState(0);
  const [sharedScrollTop, setSharedScrollTop] = useState(0);

  // State for grid drag scrolling
  const [isGridDragging, setIsGridDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragInitialScrollLeft, setDragInitialScrollLeft] = useState(0);

  // State for chart drag scrolling
  const [isChartDragging, setIsChartDragging] = useState(false);
  const [chartDragStartX, setChartDragStartX] = useState(0);
  const [chartDragInitialScrollLeft, setChartDragInitialScrollLeft] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (msaViewerContainerRef.current) {
        setViewerDimensions({
          width: msaViewerContainerRef.current.offsetWidth,
          height: msaViewerContainerRef.current.offsetHeight || 600, // Use existing or default
        });
      }
    };

    updateDimensions(); // Initial dimensions
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);


  const handleGridScroll = ({ scrollLeft, scrollTop, scrollUpdateWasRequested }) => {
    if (scrollUpdateWasRequested) return; // Prevent feedback loops

    setSharedScrollLeft(scrollLeft);
    setSharedScrollTop(scrollTop);

    if (namesListRef.current) namesListRef.current.scrollTo(scrollTop);
    if (columnNumbersListRef.current) columnNumbersListRef.current.scrollTo(scrollLeft);
    if (conservationChartContainerRef.current) conservationChartContainerRef.current.scrollLeft = scrollLeft;
  };

  const handleNamesListScroll = ({ scrollTop, scrollUpdateWasRequested }) => {
    if (scrollUpdateWasRequested) return;
    setSharedScrollTop(scrollTop);
    if (gridRef.current) gridRef.current.scrollTo({ scrollTop });
  };

  const handleColumnNumbersListScroll = ({ scrollLeft, scrollUpdateWasRequested }) => {
    if (scrollUpdateWasRequested) return;
    setSharedScrollLeft(scrollLeft);
    if (gridRef.current) gridRef.current.scrollTo({ scrollLeft });
    if (conservationChartContainerRef.current) conservationChartContainerRef.current.scrollLeft = scrollLeft;
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
  const chartContentWidth = seqs[0].length * CELL_SIZE;
  const chartHeight = BAR_HEIGHT;
  const barColor = (score) => {
    const low = [67, 170, 139];
    const high = [84, 71, 140];
    const c = low.map((l, i) => Math.round(l + (high[i] - l) * score));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };

  if (!names.length || !seqs.length) return <div>No alignment data.</div>;
  const nCols = seqs[0].length;
  const nRows = seqs.length;

  // Calculate dimensions for virtualized components
  const topSectionHeight = BAR_HEIGHT + TOP_HEIGHT;
  const gridWidth = Math.max(0, viewerDimensions.width - NAME_WIDTH - SCROLLBAR_SIZE); // Width for grid content area
  const gridHeight = Math.max(0, viewerDimensions.height - topSectionHeight - SCROLLBAR_SIZE); // Height for grid content area
  
  const namesListHeight = gridHeight + SCROLLBAR_SIZE; // Names list takes full available height including scrollbar space of grid
  
  // This is the total width for the components on the right that scroll horizontally (chart, col numbers, grid itself)
  const horizontalScrollableWidth = gridWidth + SCROLLBAR_SIZE;


  // Cell renderers for react-window
  const NameCell = ({ index, style }) => (
    <div
      style={{
        ...style,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: NAME_WIDTH, 
                height: CELL_SIZE,
                display: 'flex',
                alignItems: 'center',
        fontWeight: index === 0 ? 'bold' : 'normal',
        color: index === 0 ? '#fff' : '#eee',
                fontSize: 14,
                borderBottom: '1px solid #222',
        paddingLeft: 5, // Add some padding
              }}
      title={names[index]}
            >
      {names[index]}
            </div>
  );

  const ColumnNumberCell = ({ index, style }) => (
    <div
      key={index}
      style={{
        ...style,
        width: CELL_SIZE,
        height: TOP_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        color: hoverCol === index ? '#1b4965' : '#fff',
        background: hoverCol === index ? '#222' : 'transparent',
        borderBottom: '1px solid #222',
        borderRight: '1px solid #222',
        overflow: 'hidden',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => highlightCol(index)}
      onMouseLeave={unhighlightCol}
    >
      {String(index + 1).padStart(2, '0')}
        </div>
  );

  const AlignmentCell = ({ columnIndex, rowIndex, style }) => {
    const aa = seqs[rowIndex][columnIndex];
    const residue = (aa && typeof aa === 'string' && aa.trim().length === 1) ? aa.toUpperCase() : 'X';
    return (
      <div
          style={{ 
          ...style,
          width: CELL_SIZE,
          height: CELL_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: rowIndex === 0 ? 'bold' : 'normal',
          color: '#fff',
          background: hoverCol === columnIndex ? '#1b4965' : (AA_COLORS[residue] || '#444'),
          borderRight: '1px solid #222',
          borderBottom: '1px solid #222',
          transition: 'background 0.1s',
          overflow: 'hidden',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={() => highlightCol(columnIndex)}
        onMouseLeave={unhighlightCol}
        title={`Row: ${names[rowIndex]}\nCol: ${columnIndex + 1}\nAA: ${residue}`}
      >
        {residue}
      </div>
    );
  };

  // Grid Drag Scrolling Handlers
  const handleGridWrapperMouseDown = (e) => {
    if (e.button !== 0) return; // Only main button
    e.preventDefault();
    setIsGridDragging(true);
    setDragStartX(e.pageX);
    setDragInitialScrollLeft(sharedScrollLeft);
    // Add a class to body to change cursor globally during drag
    document.body.style.cursor = 'grabbing'; 
  };

  const handleGridWrapperMouseMove = (e) => {
    if (!isGridDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - dragStartX) * 1.5; // Adjust scroll speed if necessary
    const newScrollLeft = dragInitialScrollLeft - walk;
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: newScrollLeft });
    }
  };

  const handleGridWrapperMouseUp = (e) => {
    if (!isGridDragging) return;
    e.preventDefault();
    setIsGridDragging(false);
    document.body.style.cursor = 'default'; // Reset global cursor
  };

  const handleGridWrapperMouseLeave = (e) => {
    if (!isGridDragging) return; // Important: check if still dragging
    // Optional: decide if mouse leaving should stop drag or not.
    // For now, let's stop it to prevent unexpected scrolling if mouse re-enters later.
    setIsGridDragging(false);
    // document.body.style.cursor = 'default'; 
  };

  // Touch handlers for grid drag scrolling
  const handleGridWrapperTouchStart = (e) => {
    e.preventDefault(); // Prevent page scroll only if dragging starts on the grid
    setIsGridDragging(true);
    setDragStartX(e.touches[0].pageX);
    setDragInitialScrollLeft(sharedScrollLeft);
  };

  const handleGridWrapperTouchMove = (e) => {
    if (!isGridDragging) return;
    // e.preventDefault(); // this might be too aggressive if the user wants to scroll the page vertically
    const x = e.touches[0].pageX;
    const walk = (x - dragStartX) * 1.5; // Adjust scroll speed
    const newScrollLeft = dragInitialScrollLeft - walk;
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: newScrollLeft });
    }
  };

  const handleGridWrapperTouchEnd = () => {
    setIsGridDragging(false);
  };

  // Chart Drag Scrolling Handlers
  const handleChartMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsChartDragging(true);
    setChartDragStartX(e.pageX);
    setChartDragInitialScrollLeft(conservationChartContainerRef.current.scrollLeft);
    document.body.style.cursor = 'grabbing';
  };

  const handleChartMouseMove = (e) => {
    if (!isChartDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - chartDragStartX) * 1.5;
    const newScrollLeft = chartDragInitialScrollLeft - walk;
    
    if (conservationChartContainerRef.current) conservationChartContainerRef.current.scrollLeft = newScrollLeft;
    // Sync other components
    setSharedScrollLeft(newScrollLeft);
    if (gridRef.current) gridRef.current.scrollTo({ scrollLeft: newScrollLeft });
    if (columnNumbersListRef.current) columnNumbersListRef.current.scrollTo(newScrollLeft);
  };

  const handleChartMouseUp = (e) => {
    if (!isChartDragging) return;
    e.preventDefault();
    setIsChartDragging(false);
    document.body.style.cursor = 'default';
  };
  
  const handleChartMouseLeave = (e) => {
    if (isChartDragging) {
      // setIsChartDragging(false); // Keep dragging if mouse leaves and re-enters with button held
      // document.body.style.cursor = 'default';
    }
  };

  // Touch handlers for chart drag scrolling
  const handleChartTouchStart = (e) => {
    e.preventDefault();
    setIsChartDragging(true);
    setChartDragStartX(e.touches[0].pageX);
    setChartDragInitialScrollLeft(conservationChartContainerRef.current.scrollLeft);
  };

  const handleChartTouchMove = (e) => {
    if (!isChartDragging) return;
    const x = e.touches[0].pageX;
    const walk = (x - chartDragStartX) * 1.5;
    const newScrollLeft = chartDragInitialScrollLeft - walk;

    if (conservationChartContainerRef.current) conservationChartContainerRef.current.scrollLeft = newScrollLeft;
    setSharedScrollLeft(newScrollLeft);
    if (gridRef.current) gridRef.current.scrollTo({ scrollLeft: newScrollLeft });
    if (columnNumbersListRef.current) columnNumbersListRef.current.scrollTo(newScrollLeft);
  };

  const handleChartTouchEnd = () => {
    setIsChartDragging(false);
  };

  return (
    <div ref={msaViewerContainerRef} className="msa-viewer" style={{ background: '#111', color: '#fff', borderRadius: 8, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: viewerDimensions.height }}>
      {/* Top Section: Empty Corner + Conservation Chart & Column Numbers */}
      <div style={{ display: 'flex', flexDirection: 'row', borderBottom: '1px solid #222' }}>
        {/* Top-Left Empty Block */}
        <div style={{ minWidth: NAME_WIDTH-32, height: topSectionHeight, background: '#111' }} />
        
        {/* Top-Right: Conservation + Column Numbers */}
        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
          {/* Conservation Bar Chart Area */}
          <div style={{ display: 'flex', flexDirection: 'row', height: BAR_HEIGHT, background: '#111' }}>
            {/* Fixed Y-Axis for Conservation Chart */}
            <div style={{ width: LEFT_MARGIN, minWidth: LEFT_MARGIN, height: BAR_HEIGHT, position: 'relative' }}>
              <svg width={LEFT_MARGIN} height={BAR_HEIGHT} style={{ display: 'block', background: '#111', position: 'absolute', top: 0, left: 0 }}>
                {/* Y-axis grid lines and ticks (styled to appear fixed) */}
                {yTicks.map((tick, i) => (
                  <g key={i}>
                    {/* Line extends into scrollable area but tick text is fixed */}
                    <line 
                      x1={LEFT_MARGIN} 
                      x2={LEFT_MARGIN - 5} /* Short line for tick mark */
                      y1={BAR_HEIGHT - tick * (BAR_HEIGHT - 10)}
                      y2={BAR_HEIGHT - tick * (BAR_HEIGHT - 10)}
                      stroke="#1b4965"
                    />
                    <text
                      x={LEFT_MARGIN - 15} // Adjusted for a bit more space from edge
                      y={BAR_HEIGHT - tick * (BAR_HEIGHT - 10) + 4}
                      fontSize={12}
                      fill="#fff"
                      textAnchor="end"
                      fontWeight="bold"
                    >
                      {tick}
                    </text>
                  </g>
                ))}
                {/* Y-axis label (fixed) */}
                <text
                  x={18} // Position within the fixed LEFT_MARGIN area
                  y={BAR_HEIGHT / 2}
                  fontSize={16}
                  fill="#fff"
                  textAnchor="middle"
                  transform={`rotate(-90 18,${BAR_HEIGHT / 2})`}
                  fontWeight="bold"
                >
                  Conservation
                </text>
              </svg>
            </div>

            {/* Scrollable Conservation Bars Container*/}
            <div
              ref={conservationChartContainerRef}
              onMouseDown={handleChartMouseDown}
              onMouseMove={handleChartMouseMove}
              onMouseUp={handleChartMouseUp}
              onMouseLeave={handleChartMouseLeave}
              onTouchStart={handleChartTouchStart}
              onTouchMove={handleChartTouchMove}
              onTouchEnd={handleChartTouchEnd}
              style={{
                height: BAR_HEIGHT,
                overflowX: 'hidden', // Hidden because drag handles scrolling
                overflowY: 'hidden',
                width: Math.max(0, horizontalScrollableWidth - LEFT_MARGIN),
                cursor: isChartDragging ? 'grabbing' : 'grab',
                position: 'relative' // For tooltip positioning if needed
              }}
            >
              <svg width={chartContentWidth} height={BAR_HEIGHT} style={{ display: 'block', background: '#111' }}>
                {/* Y-axis grid lines (these scroll with bars, fainter or match fixed ones) */}
                {yTicks.map((tick, i) => (
                    <line key={`scroll-line-${i}`}
                        x1={0} 
                        x2={chartContentWidth} 
                        y1={BAR_HEIGHT - tick * (BAR_HEIGHT - 10)} 
                        y2={BAR_HEIGHT - tick * (BAR_HEIGHT - 10)}
                        stroke="#1b4965" 
                        strokeDasharray="2,2"
                    />
                ))}
                {/* Bars (x positions start from 0) */}
                {conservation.map((score, i) => (
                  <rect
                    key={i}
                    x={i * CELL_SIZE} // Adjusted: No LEFT_MARGIN here
                    y={BAR_HEIGHT - score * (BAR_HEIGHT - 10)}
                    width={CELL_SIZE - 2}
                    height={score * (BAR_HEIGHT - 10)}
                    fill={barColor(score)}
                    opacity={hoverCol === i ? 1 : 0.85}
                    onMouseEnter={e => handleBarMouseEnter(i, e)}
                    onMouseLeave={handleBarMouseLeave}
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
          </div>
          {/* Column numbers */}
          {nCols > 0 && horizontalScrollableWidth > 0 && (
            <div style={{ display: 'flex', flexDirection: 'row', width: horizontalScrollableWidth, background: '#181818', borderTop: '1px solid #222' }}>
              <div style={{ width: LEFT_MARGIN, minWidth: LEFT_MARGIN, height: TOP_HEIGHT, background: '#181818' }} /> {/* Spacer */}
              <FixedSizeList
                  ref={columnNumbersListRef}
                  height={TOP_HEIGHT}
                  itemCount={nCols}
                  itemSize={CELL_SIZE}
                  layout="horizontal"
                  width={Math.max(0, horizontalScrollableWidth - LEFT_MARGIN)} // Adjusted width
                  onScroll={handleColumnNumbersListScroll}
                  style={{ overflowX: 'hidden', overflowY: 'hidden', background:'#181818' }}
              >
                  {ColumnNumberCell}
              </FixedSizeList>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Sequence Names + Alignment Grid */}
      <div style={{ display: 'flex', flexDirection: 'row', flexGrow: 1, overflow: 'hidden' }}>
        {/* Sequence Names */}
        {nRows > 0 && namesListHeight > 0 && (
          <FixedSizeList
            ref={namesListRef}
            height={namesListHeight}
            itemCount={nRows}
            itemSize={CELL_SIZE}
            width={NAME_WIDTH}
            onScroll={handleNamesListScroll}
            style={{ overflowX: 'hidden', overflowY: 'hidden', background:'#181818', borderRight: '1px solid #222'}}
          >
            {NameCell}
          </FixedSizeList>
        )}
        {/* Alignment Grid */}
        {nRows > 0 && nCols > 0 && gridWidth > 0 && gridHeight > 0 && (
          <div
            onMouseDown={handleGridWrapperMouseDown}
            onMouseMove={handleGridWrapperMouseMove}
            onMouseUp={handleGridWrapperMouseUp}
            onMouseLeave={handleGridWrapperMouseLeave} // handles mouse leaving the component
            onTouchStart={handleGridWrapperTouchStart}
            onTouchMove={handleGridWrapperTouchMove}
            onTouchEnd={handleGridWrapperTouchEnd}
            style={{
              cursor: isGridDragging ? 'grabbing' : 'grab',
              width: horizontalScrollableWidth, 
              height: gridHeight + SCROLLBAR_SIZE, 
              // overflow: 'hidden', // REMOVED to allow FixedSizeGrid's scrollbar
              display: 'flex', 
              flexDirection: 'row'
            }}
          >
            <div style={{ width: LEFT_MARGIN, minWidth: LEFT_MARGIN, background: '#181818' }} /> {/* Spacer */}
            <FixedSizeGrid
              ref={gridRef}
              columnCount={nCols}
              columnWidth={CELL_SIZE}
              rowCount={nRows}
              rowHeight={CELL_SIZE}
              width={Math.max(0, horizontalScrollableWidth - LEFT_MARGIN)} // Adjusted width
              height={gridHeight + SCROLLBAR_SIZE} // Full height for grid + its scrollbar
              onScroll={handleGridScroll}
              itemData={{ names, seqs, hoverCol, highlightCol, unhighlightCol, AA_COLORS }}
              style={{ background: '#181818', border: '0px solid #222' }}
            >
              {AlignmentCell}
            </FixedSizeGrid>
          </div>
        )}
      </div>
    </div>
  );
};

export default MSAViewer; 
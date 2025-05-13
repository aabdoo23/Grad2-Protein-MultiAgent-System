const BlockLoopControls = ({ loopConfig, setLoopConfig, blockId }) => {
    const handleLoopBlockSelect = (type) => {
      setLoopConfig(prev => ({
        ...prev,
        [type === 'start' ? 'startBlockId' : 'endBlockId']: blockId
      }));
    };
  
    const isStartBlock = loopConfig.startBlockId === blockId;
    const isEndBlock = loopConfig.endBlockId === blockId;
  
    return (
      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <h5 className="text-white/80 text-xs font-medium">Loop Configuration</h5>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleLoopBlockSelect('start')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              isStartBlock 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/20'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {isStartBlock ? 'Start Block ✓' : 'Set as Start'}
          </button>
          <button
            onClick={() => handleLoopBlockSelect('end')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              isEndBlock 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/20'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isEndBlock ? 'End Block ✓' : 'Set as End'}
          </button>
        </div>
      </div>
    );
  };
  export default BlockLoopControls;
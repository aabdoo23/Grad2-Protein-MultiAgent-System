const BlockPort = ({ type, isInput, isConnecting, onPortClick, onPortHover, isMultiDownload, connectionCount }) => (
    <div className={`flex items-center ${isInput ? 'my-3' : 'my-3 justify-end'} group`}>
      {isInput && (
        <div
          className={`w-4 h-4 rounded-full cursor-pointer border-2 flex items-center justify-center relative
            transition-all duration-200
            ${isConnecting ? 'border-white hover:bg-white/30' : 'border-gray-400 group-hover:border-white'}
          `}
          onClick={() => onPortClick(type)}
          onMouseEnter={() => onPortHover(type, true)}
          onMouseLeave={() => onPortHover(type, false)}
        >
          <div className="w-2 h-2 bg-white rounded-full transition-transform duration-200 group-hover:scale-125"></div>
          {isMultiDownload && connectionCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
              {connectionCount}
            </div>
          )}
        </div>
      )}
      <span className={`text-white/80 text-xs ${isInput ? 'ml-2' : 'mr-2'} group-hover:text-white transition-colors duration-200`}>
        {type}
        {isMultiDownload && " (multiple)"}
      </span>
      {!isInput && (
        <div
          className="w-4 h-4 rounded-full border-2 border-gray-400 cursor-pointer hover:bg-white/30 flex items-center justify-center transition-all duration-200 group-hover:border-white"
          onClick={() => onPortClick(type)}
        >
          <div className="w-2 h-2 bg-white rounded-full transition-transform duration-200 group-hover:scale-125"></div>
        </div>
      )}
    </div>
  );
export default BlockPort;
import React from 'react';

const JobConfirmation = ({ job, onConfirm, onReject }) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-xl px-4 py-2 bg-[#233c48] text-white">
        <div className="font-medium mb-2">{job.title}</div>
        <div className="text-sm text-gray-300 mb-3">{job.description}</div>
        <div className="flex gap-2">
          <button 
            onClick={() => onConfirm(job.id)}
            className="px-3 py-1 bg-[#13a4ec] text-white rounded-lg text-sm hover:bg-[#0f8fd1]"
          >
            Confirm
          </button>
          <button 
            onClick={() => onReject(job.id)}
            className="px-3 py-1 bg-[#233c48] text-white border border-[#13a4ec] rounded-lg text-sm hover:bg-[#2a4a5a]"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobConfirmation; 
'use client';

interface MessagePartProps {
  part: {
    id?: string;
    partType: string;
    text?: string;
    state?: string;
    toolName?: string;
    toolCallId?: string;
    input?: any;
    output?: any;
    errorText?: string;
    url?: string;
    title?: string;
    filename?: string;
    mediaType?: string;
  };
}

export function MessagePart({ part }: MessagePartProps) {
  // Handle text and reasoning parts
  if (part.partType === 'text' || part.partType === 'reasoning') {
    if (!part.text) return null;
    
    return (
      <div className={`${part.partType === 'reasoning' ? 'bg-slate-50 border-l-2 border-slate-300 pl-3 py-2 my-2' : ''}`}>
        {part.partType === 'reasoning' && (
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Reasoning</div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{part.text}</div>
      </div>
    );
  }

  // Handle tool calls
  if (part.partType === 'tool') {
    const isError = part.state === 'output-error';
    const isComplete = part.state === 'output-available';
    const isRunning = part.state === 'input-streaming' || part.state === 'input-available';
    
    return (
      <div className={`border rounded-md my-2 overflow-hidden ${
        isError ? 'border-red-200 bg-red-50/50' : 
        isComplete ? 'border-gray-200 bg-white' : 
        'border-gray-200 bg-gray-50/50'
      }`}>
        <div className={`px-3 py-2 border-b ${
          isError ? 'bg-red-100/50 border-red-200' :
          isComplete ? 'bg-gray-50 border-gray-200' :
          'bg-gray-100/50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-gray-700">
              {part.toolName}
            </span>
            <span className={`text-[10px] font-medium uppercase tracking-wider ${
              isRunning ? 'text-amber-600' :
              isComplete ? 'text-green-600' :
              isError ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {isRunning ? 'Running' :
               isComplete ? 'Complete' :
               isError ? 'Failed' :
               'Pending'}
            </span>
          </div>
        </div>
        
        <div className="p-3 space-y-2">
          {part.input && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] font-medium text-gray-500 hover:text-gray-700 uppercase tracking-wider">
                Input
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-[11px] overflow-x-auto font-mono">
                {typeof part.input === 'string' ? part.input : JSON.stringify(part.input, null, 2)}
              </pre>
            </details>
          )}
          
          {part.output && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] font-medium text-gray-500 hover:text-gray-700 uppercase tracking-wider">
                Output
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-[11px] overflow-x-auto font-mono">
                {typeof part.output === 'string' ? part.output : JSON.stringify(part.output, null, 2)}
              </pre>
            </details>
          )}
          
          {part.errorText && (
            <div className="text-xs text-red-600 font-medium">
              {part.errorText}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle file parts
  if (part.partType === 'file' || part.partType === 'sourceDocument') {
    return (
      <div className="border border-gray-200 rounded-md p-3 my-2 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="text-sm font-medium text-gray-700">{part.filename || part.title || 'File'}</span>
            {part.mediaType && (
              <span className="text-xs text-gray-400">({part.mediaType})</span>
            )}
          </div>
          {part.url && (
            <a href={part.url} target="_blank" rel="noopener noreferrer" 
               className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View
            </a>
          )}
        </div>
      </div>
    );
  }

  // Handle source URL parts
  if (part.partType === 'sourceUrl') {
    return (
      <div className="border border-gray-200 rounded-md p-3 my-2 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
          <a href={part.url} target="_blank" rel="noopener noreferrer" 
             className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            {part.title || part.url}
          </a>
        </div>
      </div>
    );
  }

  // Handle step start
  if (part.partType === 'stepStart') {
    return (
      <div className="border-l-2 border-indigo-300 pl-3 my-2">
        <div className="text-[10px] uppercase tracking-wider text-indigo-600 font-medium">Step</div>
        {part.text && <div className="text-sm mt-1 text-gray-700">{part.text}</div>}
      </div>
    );
  }

  // Handle data parts
  if (part.partType === 'data') {
    return (
      <div className="border border-gray-200 rounded-md my-2 bg-gray-50/50">
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Data</div>
        </div>
        <pre className="p-3 text-[11px] overflow-x-auto font-mono text-gray-600">
          {JSON.stringify(part, null, 2)}
        </pre>
      </div>
    );
  }

  // Unknown part type - show for debugging
  return (
    <div className="border border-amber-200 rounded-md my-2 bg-amber-50/50">
      <div className="px-3 py-2 border-b border-amber-200 bg-amber-100/50">
        <div className="text-[10px] font-medium uppercase tracking-wider text-amber-700">
          Unknown: {part.partType}
        </div>
      </div>
      <pre className="p-3 text-[11px] overflow-x-auto font-mono text-amber-700">
        {JSON.stringify(part, null, 2)}
      </pre>
    </div>
  );
}
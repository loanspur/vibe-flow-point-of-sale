import React from 'react';

export const DebugEnv: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Environment Debug</h4>
      <div>SUPABASE_URL: {supabaseUrl ? '✅ Set' : '❌ Missing'}</div>
      <div>SUPABASE_KEY: {supabaseKey ? '✅ Set' : '❌ Missing'}</div>
      <div>URL Length: {supabaseUrl?.length || 0}</div>
      <div>Key Length: {supabaseKey?.length || 0}</div>
      <button 
        onClick={() => {
          console.log('SUPABASE_URL:', supabaseUrl);
          console.log('SUPABASE_KEY:', supabaseKey);
        }}
        style={{ marginTop: '5px', padding: '2px 5px' }}
      >
        Log to Console
      </button>
    </div>
  );
};


import { useState } from 'react';

import { BottomBar } from './components/BottomBar/BottomBar';
import { TimerOption } from './components/Timer/TimerOption';
import { PlaceholderA } from './components/PlaceholderA/PlaceholderA';
import { PlaceholderB } from './components/PlaceholderB/PlaceholderB';
import { PlaceholderC } from './components/PlaceholderC/PlaceholderC';

// Styles
import '../styles/App.css';
import '../styles/components/ActivityCharts.css';

export default function App() {
  const [activeKey, setActiveKey] = useState('timer');
  const [currentUser, setCurrentUser] = useState(null);

  const screens = {
    timer: <TimerOption currentUser={currentUser} onUserSelect={setCurrentUser} />,
    a: <PlaceholderA />,
    b: <PlaceholderB />,
    c: <PlaceholderC />,
  };

  return (
    <div className="app-shell">
      {screens[activeKey]}
      {(activeKey !== 'timer' || !!currentUser) && (
        <BottomBar activeKey={activeKey} onChange={setActiveKey} />
      )}
    </div>
  );
}

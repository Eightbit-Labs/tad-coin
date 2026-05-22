import './App.css';

interface alertBoxProps {
  alertText: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShowAlert({isOpen, onClose, alertText}: alertBoxProps) {
  if (!isOpen) return null;
  return(
    <div className="overlay">
      <div className="alertbox">
        <p>{alertText}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
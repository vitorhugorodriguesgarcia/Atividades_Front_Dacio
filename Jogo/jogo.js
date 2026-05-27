import React, { useState, useRef } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0';

function GiggityGame() {
  const [showQuagmire, setShowQuagmire] = useState(false);
  const [score, setScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  
 
  const audioUrl = "https://media.voicy.network/Content/Content/Sound/5FDiNoUCJEipOkh8VUt4XA.mp3";
  
  
  const audioRef = useRef(new Audio(audioUrl));
  audioRef.current.preload = "auto";

  const handleGiggityClick = () => {
   
    audioRef.current.currentTime = 0;
    
   
    audioRef.current.play().catch(err => {
      console.warn("O navegador bloqueou o áudio temporariamente. Clique de novo!", err);
    });


    setShowQuagmire(true);
    setScore(prev => prev + 1);
    setIsShaking(true);

    setTimeout(() => {
      setIsShaking(false);
    }, 200);

    setTimeout(() => {
      setShowQuagmire(false);
    }, 1200);
  };

  return (
    <div className="game-container">
      <h1>Quagmire's Giggity Button</h1>
      <p>Giggity Contador: <strong style={{color: '#ffcc00', fontSize: '1.5rem'}}>{score}</strong></p>
      
      <button 
        className={`btn-giggity ${isShaking ? 'shake-effect' : ''}`} 
        onClick={handleGiggityClick}
      >
        GIGGITY!
      </button>

      <div className="image-container">
        {showQuagmire && (
          <img 
            src="https://upload.wikimedia.org/wikipedia/en/f/fe/Glenn_Quagmire.png" 
            alt="Glenn Quagmire" 
            className="quagmire-img"
          />
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<GiggityGame />);


const audioRef = useRef(null);


React.useEffect(() => {
  audioRef.current = new Audio(audioUrl);
  audioRef.current.preload = "auto";
}, []);
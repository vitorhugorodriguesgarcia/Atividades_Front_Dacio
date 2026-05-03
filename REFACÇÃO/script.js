function revelar() {
    document.querySelector('.card-img-top').src = "img/_vinicius_junior.png";
    document.getElementById('Nome').innerText = "Vinícius Júnior";
    document.getElementById('Rank').innerText = "9,5";
    document.getElementById('Data_Nas').innerText = "12/07/2000 (25 anos)";
    document.getElementById('Alutra').innerText = "1,76 m";
    document.getElementById('Posição ').innerText = "Ponta-esquerda / Atacante";

    const elementos = document.querySelectorAll('.placeholder');
    elementos.forEach(item => {
        item.classList.remove('placeholder', 'col-4', 'col-6');
        item.classList.add('card-text');
    });
    document.querySelector('.placeholder-glow').classList.remove('placeholder-glow');
    document.querySelector('.card-text.placeholder-glow').classList.remove('placeholder-glow');
}
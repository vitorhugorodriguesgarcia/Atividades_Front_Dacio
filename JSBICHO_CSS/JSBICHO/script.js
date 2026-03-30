const bicho = document.getElementById("bicho");
const btn = document.getElementById("btn");

const estados = {
normal: "bicho.png",
clicando: "b_s.png",
alimentando: "muitoFeliz.png",
fome30: "puto.png",
fome60: "morto.png",
}

let contador = 0;
let intervalo = null;
let time_Click = null;
let time_Out = null;



function init_cont (){
    if(intervalo) clearInterval(intervalo)


    intervalo = setInterval(()=>{
        contador++;
        console.log("Tempo: ", contador);

        if(contador == 30){
            bicho.src = estados.fome30;
        }

        if(contador == 60){
            bicho.src = estados.fome60;
        }
    }, 1000);
}

function alimentar(){
    bicho.src = estados.clicando;
    contador = 0;
    console.log("clicando");

    if(time_Click) clearInterval(time_Click)

        time_Click = setTimeout(()=>{
            bicho.src = estados.alimentando;

        time_Out = setTimeout(()=>{
            bicho.src = estados.normal
            },3000)
        }, 2000)

}

init_cont();
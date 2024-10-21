document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const registered = urlParams.get('registered'); // Obtém o parâmetro da URL
    const badgeModal = document.getElementById("badgeModal");
    const imageModal = document.getElementById("imageModal");
    const closeBtns = document.querySelectorAll(".close");
    const badgeSound = document.getElementById("badgeSound");

   
    if (registered) {
        // Exibe o modal inicial
        badgeModal.style.display = "block";
        badgeSound.play().catch(function (error) {
            console.log("Erro ao tocar som:", error);
        });
    }


    closeBtns[0].onclick = function () {
        badgeModal.style.display = "none";
        imageModal.style.display = "block";
    }

  
    closeBtns[1].onclick = function () {
        imageModal.style.display = "none";
    }

    // Fecha os modais ao clicar fora deles
    window.onclick = function (event) {
        if (event.target === badgeModal) {
            badgeModal.style.display = "none";
        }
        if (event.target === imageModal) {
            imageModal.style.display = "none";
        }
    }
});
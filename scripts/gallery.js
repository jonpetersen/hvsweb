document.addEventListener("DOMContentLoaded", function () {
  const gridItems = document.querySelectorAll(".grid-item");
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  const expandedImage = document.getElementById("expanded-image");
  const closeModal = document.getElementById("close-modal");

  gridItems.forEach((item) => {
    item.addEventListener("click", function () {
      const clickedImageSrc = this.querySelector("img").src;
      expandedImage.src = clickedImageSrc;
      overlay.style.display = "block";
    });
  });

  closeModal.addEventListener("click", function () {
    overlay.style.display = "none";
  });
});

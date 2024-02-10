document.addEventListener("DOMContentLoaded", function () {
  const gridItems = document.querySelectorAll(".grid-item");

  gridItems.forEach((item) => {
    item.addEventListener("click", function () {
      this.querySelector("img").style.transform = "scale(4)";
    });

    item.addEventListener("mouseleave", function () {
      this.querySelector("img").style.transform = "scale(1)";
    });
  });
});

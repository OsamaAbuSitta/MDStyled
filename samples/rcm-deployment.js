mdstyled.onReady(() => {
  mdstyled.queryAll("table").forEach(table => {
    table.classList.add("mdstyled-table");
  });

  mdstyled.queryAll("h2").forEach(heading => {
    heading.style.cursor = "pointer";
    heading.addEventListener("click", () => {
      const section = heading.parentElement;
      if (section && section.classList.contains("service")) {
        section.classList.toggle("collapsed");
      }
    });
  });
});

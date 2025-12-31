const form = document.getElementById("thumbnail-form");
const templateSelect = document.getElementById("template");
const statusBadge = document.getElementById("status");
const preview = document.getElementById("preview");
const placeholder = document.getElementById("placeholder");

const fields = {
  main_title: document.getElementById("main_title"),
  left_caption: document.getElementById("left_caption"),
  right_caption: document.getElementById("right_caption"),
  primary_color: document.getElementById("primary_color"),
  font_size: document.getElementById("font_size")
};

function applyTemplate(template) {
  fields.main_title.value = template.main_title;
  fields.left_caption.value = template.left_caption;
  fields.right_caption.value = template.right_caption;
  fields.primary_color.value = template.primary_color;
  fields.font_size.value = template.font_size;
}

function getSelectedTemplate() {
  const option = templateSelect.selectedOptions[0];
  return JSON.parse(option.dataset.template);
}

applyTemplate(getSelectedTemplate());

templateSelect.addEventListener("change", () => {
  applyTemplate(getSelectedTemplate());
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBadge.textContent = "Generating...";

  const formData = new FormData(form);

  try {
    const response = await fetch("/generate", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to generate image.");
    }

    preview.src = `${result.output}?t=${Date.now()}`;
    preview.classList.remove("hidden");
    placeholder.classList.add("hidden");
    statusBadge.textContent = "Generated";
  } catch (error) {
    statusBadge.textContent = "Error";
    alert(error.message);
  }
});

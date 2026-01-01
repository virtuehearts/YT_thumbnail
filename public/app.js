const form = document.getElementById("thumbnail-form");
const templateSelect = document.getElementById("template");
const presetSelect = document.getElementById("style_preset");
const presetNameInput = document.getElementById("preset_name");
const savePresetButton = document.getElementById("save-preset");
const statusBadge = document.getElementById("status");
const preview = document.getElementById("preview");
const placeholder = document.getElementById("placeholder");
const contentTypeSelect = document.getElementById("content_type");
const jsonTemplateSelect = document.getElementById("json_template");
const templateJsonArea = document.getElementById("template_json");
const varsJsonArea = document.getElementById("vars_json");
const formatTemplateButton = document.getElementById("format-template");
const formatVarsButton = document.getElementById("format-vars");
const exportTemplateButton = document.getElementById("export-template");
const exportVarsButton = document.getElementById("export-vars");
const jsonTemplateNameInput = document.getElementById("json_template_name");
const jsonTemplateTypeInput = document.getElementById("json_template_type");
const saveJsonTemplateButton = document.getElementById("save-json-template");
const updateJsonTemplateButton = document.getElementById("update-json-template");

const fields = {
  main_title: document.getElementById("main_title"),
  left_caption: document.getElementById("left_caption"),
  right_caption: document.getElementById("right_caption"),
  primary_color: document.getElementById("primary_color"),
  font_size: document.getElementById("font_size"),
  font_family: document.getElementById("font_family"),
  font_style: document.getElementById("font_style"),
  banner_height: document.getElementById("banner_height"),
  panel_height: document.getElementById("panel_height"),
  panel_margin: document.getElementById("panel_margin"),
  panel_padding: document.getElementById("panel_padding"),
  panel_gap: document.getElementById("panel_gap"),
  divider_width: document.getElementById("divider_width"),
  divider_opacity: document.getElementById("divider_opacity")
};

let jsonTemplates = window.jsonTemplates || [];

function applyTemplate(template) {
  fields.main_title.value = template.main_title;
  fields.left_caption.value = template.left_caption;
  fields.right_caption.value = template.right_caption;
  fields.primary_color.value = template.primary_color;
  fields.font_size.value = template.font_size;
}

function applyPreset(preset) {
  fields.primary_color.value = preset.primary_color;
  fields.font_size.value = preset.font_size;
  fields.banner_height.value = preset.banner_height;
  fields.panel_height.value = preset.panel_height;
  fields.panel_margin.value = preset.panel_margin;
  fields.panel_padding.value = preset.panel_padding;
  fields.panel_gap.value = preset.panel_gap;
  fields.divider_width.value = preset.divider_width;
  fields.divider_opacity.value = preset.divider_opacity;
}

function getSelectedTemplate() {
  const option = templateSelect.selectedOptions[0];
  return JSON.parse(option.dataset.template);
}

applyTemplate(getSelectedTemplate());
if (presetSelect) {
  const selectedPreset = presetSelect.selectedOptions[0];
  if (selectedPreset && selectedPreset.dataset.preset) {
    applyPreset(JSON.parse(selectedPreset.dataset.preset));
  } else {
    fields.banner_height.value = 120;
    fields.panel_height.value = 220;
    fields.panel_margin.value = 30;
    fields.panel_padding.value = 18;
    fields.panel_gap.value = 20;
    fields.divider_width.value = 8;
    fields.divider_opacity.value = 120;
  }
}

templateSelect.addEventListener("change", () => {
  applyTemplate(getSelectedTemplate());
});

if (presetSelect) {
  presetSelect.addEventListener("change", () => {
    const option = presetSelect.selectedOptions[0];
    if (option && option.dataset.preset) {
      applyPreset(JSON.parse(option.dataset.preset));
    }
  });
}

if (savePresetButton) {
  savePresetButton.addEventListener("click", async () => {
    const name = presetNameInput.value.trim();
    if (!name) {
      alert("Please provide a name for the preset.");
      return;
    }
    const payload = {
      name,
      primary_color: fields.primary_color.value,
      font_size: Number(fields.font_size.value),
      banner_height: Number(fields.banner_height.value),
      panel_height: Number(fields.panel_height.value),
      panel_margin: Number(fields.panel_margin.value),
      panel_padding: Number(fields.panel_padding.value),
      panel_gap: Number(fields.panel_gap.value),
      divider_width: Number(fields.divider_width.value),
      divider_opacity: Number(fields.divider_opacity.value)
    };

    try {
      const response = await fetch("/api/style-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save preset.");
      }
      const option = document.createElement("option");
      option.value = result.id;
      option.dataset.preset = JSON.stringify(result);
      option.textContent = result.name;
      presetSelect.appendChild(option);
      presetSelect.value = result.id;
      presetNameInput.value = "";
    } catch (error) {
      alert(error.message);
    }
  });
}

function buildJsonTemplateOptions() {
  const selectedType = contentTypeSelect.value;
  const filtered = jsonTemplates.filter((item) => item.content_type === selectedType);
  jsonTemplateSelect.innerHTML = "";
  filtered.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    option.dataset.template = JSON.stringify(template);
    jsonTemplateSelect.appendChild(option);
  });
  if (filtered.length) {
    jsonTemplateSelect.value = filtered[0].id;
    loadJsonTemplate(filtered[0]);
  } else {
    templateJsonArea.value = "";
    varsJsonArea.value = "";
    jsonTemplateNameInput.value = "";
    jsonTemplateTypeInput.value = selectedType;
  }
}

function loadJsonTemplate(template) {
  templateJsonArea.value = template.template_json;
  varsJsonArea.value = template.vars_json;
  jsonTemplateNameInput.value = template.name;
  jsonTemplateTypeInput.value = template.content_type;
}

function getSelectedJsonTemplate() {
  const option = jsonTemplateSelect.selectedOptions[0];
  if (!option || !option.dataset.template) {
    return null;
  }
  return JSON.parse(option.dataset.template);
}

function formatJson(textarea) {
  try {
    const parsed = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(parsed, null, 2);
  } catch (error) {
    alert("Invalid JSON. Please fix errors before formatting.");
  }
}

function downloadJson(filename, contents) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

if (contentTypeSelect) {
  buildJsonTemplateOptions();
  contentTypeSelect.addEventListener("change", buildJsonTemplateOptions);
  jsonTemplateSelect.addEventListener("change", () => {
    const template = getSelectedJsonTemplate();
    if (template) {
      loadJsonTemplate(template);
    }
  });
}

formatTemplateButton.addEventListener("click", () => formatJson(templateJsonArea));
formatVarsButton.addEventListener("click", () => formatJson(varsJsonArea));
exportTemplateButton.addEventListener("click", () => {
  const name = jsonTemplateNameInput.value.trim() || "template";
  downloadJson(`${name.replace(/\s+/g, "_").toLowerCase()}_template.json`, templateJsonArea.value);
});
exportVarsButton.addEventListener("click", () => {
  const name = jsonTemplateNameInput.value.trim() || "template";
  downloadJson(`${name.replace(/\s+/g, "_").toLowerCase()}_vars.json`, varsJsonArea.value);
});

async function saveJsonTemplate({ id }) {
  const payload = {
    id,
    name: jsonTemplateNameInput.value.trim(),
    content_type: jsonTemplateTypeInput.value.trim(),
    template_json: templateJsonArea.value,
    vars_json: varsJsonArea.value
  };

  try {
    const response = await fetch("/api/json-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to save JSON template.");
    }
    const existingIndex = jsonTemplates.findIndex((item) => item.id === result.id);
    if (existingIndex >= 0) {
      jsonTemplates[existingIndex] = result;
    } else {
      jsonTemplates.push(result);
    }
    contentTypeSelect.value = result.content_type;
    buildJsonTemplateOptions();
    jsonTemplateSelect.value = result.id;
    loadJsonTemplate(result);
  } catch (error) {
    alert(error.message);
  }
}

saveJsonTemplateButton.addEventListener("click", () => saveJsonTemplate({}));
updateJsonTemplateButton.addEventListener("click", () => {
  const selected = getSelectedJsonTemplate();
  if (!selected) {
    alert("Select a template to update.");
    return;
  }
  saveJsonTemplate({ id: selected.id });
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

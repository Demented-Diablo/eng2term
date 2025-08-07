const btn = document.getElementById('generateBtn');
const input = document.getElementById('userInput');
const outputEl = document.getElementById('output');

function cleanClient(text = '') {
  let t = String(text).trim();
  t = t.replace(/```[a-z]*\s*([\s\S]*?)```/gi, '$1');
  t = t.replace(/`+/g, '');
  t = t.replace(/^\s*(bash|sh|shell)\s*/i, '');
  t = t.replace(/^\s*(command:)\s*/i, '');
  t = t.replace(/^\s*>?\s*\$\s*/gm, '');
  const first = t.split(/\r?\n/).find(l => l.trim()) || '';
  return first.trim();
}

btn.addEventListener('click', async () => {
  const instruction = input.value.trim();
  if (!instruction) {
    outputEl.textContent = 'Please enter an instruction.';
    return;
  }

  btn.disabled = true;
  outputEl.textContent = 'Generating...';

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction })
    });

    const data = await response.json();
    if (!response.ok) {
      outputEl.textContent = data.error || 'Request failed.';
    } else {
      const cmd = cleanClient(data.command || '');
      outputEl.textContent = cmd || 'No command returned.';
    }
  } catch (err) {
    outputEl.textContent = 'Error: ' + err.message;
  } finally {
    // tiny cooldown to deter spam clicking
    setTimeout(() => { btn.disabled = false; }, 1500);
  }
});

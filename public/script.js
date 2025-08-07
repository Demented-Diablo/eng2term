document.getElementById('generateBtn').addEventListener('click', async () => {
  const instruction = document.getElementById('userInput').value.trim();
  const outputEl = document.getElementById('output');

  if (!instruction) {
    outputEl.textContent = 'Please enter an instruction.';
    return;
  }

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction })
    });

    const data = await response.json();

    if (data.command) {
      outputEl.textContent = data.command;
    } else {
      outputEl.textContent = 'No command returned.';
    }
  } catch (err) {
    outputEl.textContent = 'Error: ' + err.message;
  }
});

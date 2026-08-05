import os

server_path = "Sovereign-Estate/server.ts"

with open(server_path, "r") as f:
    content = f.read()

# Route implementation checking both local and root ledger paths
ledger_code = """
// Soliton Ledger Endpoint
app.get('/ledger', (req: any, res: any) => {
  const rootLedger = path.resolve(__dirname, '../ledger.json');
  const localLedger = path.resolve(__dirname, 'ledger.json');
  
  const targetPath = fs.existsSync(rootLedger) ? rootLedger : (fs.existsSync(localLedger) ? localLedger : null);
  
  if (targetPath) {
    try {
      const data = fs.readFileSync(targetPath, 'utf8');
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: 'Failed to parse ledger JSON' });
    }
  } else {
    res.json([]);
  }
});
"""

if "app.get('/ledger'" not in content:
    # Ensure imports exist at top
    imports = ""
    if "import fs from 'fs';" not in content:
        imports += "import fs from 'fs';\n"
    if "import path from 'path';" not in content:
        imports += "import path from 'path';\n"
    
    content = imports + content
    
    # Inject before app.listen
    if "app.listen" in content:
        content = content.replace("app.listen", ledger_code + "\napp.listen")
    else:
        content += "\n" + ledger_code

    with open(server_path, "w") as f:
        f.write(content)
    print("Successfully patched /ledger into Sovereign-Estate/server.ts")
else:
    print("/ledger route already exists in server.ts")

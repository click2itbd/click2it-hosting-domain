const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/AdminDashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

function replaceSection(code, searchStart, searchEndNext, replacement) {
  const startIndex = code.indexOf(searchStart);
  if (startIndex === -1) {
    console.log("Could not find start:", searchStart.trim());
    return code;
  }
  const nextConditionIndex = code.indexOf(searchEndNext, startIndex + searchStart.length);
  if (nextConditionIndex === -1) {
    console.log("Could not find next condition:", searchEndNext.trim());
    return code;
  }
  // nextConditionIndex points to the `\n        ) : activeTab === ` part.
  const block = code.substring(startIndex, nextConditionIndex);
  console.log(`Replacing block of length ${block.length}`);
  
  return code.substring(0, startIndex) + replacement + code.substring(nextConditionIndex);
}

// 1. Users
code = replaceSection(
  code, 
  "        ) : activeTab === 'users' && isAdmin ? (", 
  "\n        ) : activeTab === 'siteSettings'", 
  "        ) : activeTab === 'users' && isAdmin ? (\n          <Users users={users} isAdmin={isAdmin} hasPermission={hasPermission} formatCurrency={formatCurrency} cn={cn} toast={toast} fetchData={fetchData} />"
);
// Wait, what's after users? Let's check what comes after users in the code.
// I will just read the code and match `\n        ) : activeTab === `

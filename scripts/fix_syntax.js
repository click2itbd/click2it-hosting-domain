const fs = require('fs');
let text = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const targetStr = `            html: emailHtml,
          }),
  useEffect(() => {`;

const replacementStr = `            html: emailHtml,
          }),
        });
      } catch (error) {
        console.error('Error sending low stock alert:', error);
      }
    }
  };

  useEffect(() => {`;

if (text.includes(targetStr)) {
  text = text.replace(targetStr, replacementStr);
  fs.writeFileSync('src/pages/AdminDashboard.tsx', text);
  console.log('Fixed exactly!');
} else {
  console.log('Target string not found');
}

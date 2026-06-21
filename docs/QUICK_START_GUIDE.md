# Quick Start Guide - Custom PDF Model & Uncensored AI

## 🚀 What's Been Fixed

### 1. PDF Generation System ✅
- Direct PDF download (no popups)
- Professional A4 formatting
- Multi-page support
- High-quality rendering

### 2. AI Response System ✅
- More helpful and responsive
- Clear academic vs professional handling
- No artificial restrictions on professional queries
- Comprehensive, detailed answers

## 📋 How to Use

### Starting the Application

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Open browser to: `http://localhost:3002`

### Generating PDF Documents

1. **Ask the AI to create a report**:
   ```
   "Create a business analysis report for [topic]"
   ```

2. **AI will wrap content in PDF code block**:
   ````markdown
   ```pdf
   # Your Report Content
   ...
   ```
   ````

3. **Click the "Download PDF" button** that appears

4. **PDF downloads automatically** - no popups needed!

### Getting Comprehensive Answers

#### For Academic Work:
**Ask**: "Help me understand how to approach [assignment topic]"

**You'll Get**:
- Explanation of concepts
- Framework and methodology
- Step-by-step guidance
- Examples to learn from
- Guidance to create your own work

#### For Professional Work:
**Ask**: "Create a [document/code/strategy] for [purpose]"

**You'll Get**:
- Complete, working solution
- Detailed implementation
- Code examples
- Best practices
- Actionable next steps

## 🎯 Example Queries

### PDF Generation:
```
"Generate a market analysis report for e-commerce in PDF format"
"Create a financial projection document"
"Make a business proposal for [project]"
```

### Business Analysis:
```
"Analyze the competitive landscape for [industry]"
"Create a go-to-market strategy for [product]"
"Design a sales funnel for [business]"
```

### Technical Solutions:
```
"Write code to implement [feature]"
"Design a database schema for [application]"
"Create an API architecture for [system]"
```

### Document Creation:
```
"Create a job description for [role]"
"Write a contract template for [purpose]"
"Design a pitch deck outline for [startup]"
```

## 🔧 Model Selection

### Recommended Models:

**For Business Analysis**:
- DeepSeek R1 (best reasoning)
- Llama 3.3 70B (comprehensive)
- Gemma 3 27B (balanced)

**For Technical Work**:
- DeepSeek V4 (excellent for code)
- Llama 3.3 70B (strong technical)
- Qwen 3 (fast, capable)

**For Document Generation**:
- DeepSeek R1 (detailed)
- Gemma 3 27B (well-structured)
- Mistral 7B (fast)

### Changing Models:
1. Click the model dropdown in the dashboard
2. Select your preferred model
3. Start chatting

## 📊 Artifact Types

### PDF Reports:
```
"Create a PDF report about [topic]"
```
→ Downloads as `.pdf` file

### Word Documents:
```
"Generate a Word document for [purpose]"
```
→ Downloads as `.doc` file

### Excel Spreadsheets:
```
"Create an Excel spreadsheet with [data]"
```
→ Downloads as `.csv` file

### UML Diagrams:
```
"Create a flowchart for [process]"
"Design a database ERD for [system]"
```
→ Interactive diagram with download options

## ⚙️ Settings

### API Keys:
Located in `.env.local`:
```env
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
```

### Adding More Keys:
1. Go to Settings in the dashboard
2. Add OpenRouter or Groq API keys
3. Keys are stored securely in database
4. Automatic rotation for reliability

## 🎨 Features

### Brain Trust Mode:
- Multi-agent analysis
- 16-agent executive board
- Comprehensive strategies
- Toggle in UI

### Tone Selection:
- Brutally Honest (default)
- Professional
- Friendly
- Technical
- Custom tones

### Specialist Agents:
- Innovation Idea Generator
- CFO Finance Consultant
- Market Research Expert
- Competitor Intelligence
- Project Manager
- CTO Architect
- Sales & Lead Generator
- Marketing & Content Creator
- Social Media Manager
- Legal & Compliance
- HR & Recruiting
- Investor Pitch Consultant
- Performance Marketer
- IT Automation Expert
- Pain-Point Scraper

## 🐛 Troubleshooting

### PDF Not Downloading:
1. Check browser download settings
2. Allow downloads from localhost
3. Disable download blockers
4. Try different browser

### AI Not Responding:
1. Check API keys are valid
2. Try different model
3. Refresh the page
4. Check browser console for errors

### Incomplete Responses:
1. Be more specific in your question
2. Try a different model
3. Check API key has credits
4. Use Brain Trust mode for complex queries

### Build Errors:
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## 📚 Documentation

- `PDF_GENERATION_IMPROVEMENTS.md` - Technical PDF details
- `CUSTOM_PDF_MODEL_SUMMARY.md` - PDF feature overview
- `UNCENSORED_AI_CONFIGURATION.md` - AI behavior details
- `QUICK_START_GUIDE.md` - This file

## 🎯 Best Practices

### For Best Results:

1. **Be Specific**: 
   - ❌ "Help me with business"
   - ✅ "Create a go-to-market strategy for a B2B SaaS product targeting SMBs"

2. **Provide Context**:
   - Include relevant details
   - Specify your industry/market
   - Mention constraints or requirements

3. **Use Specialist Agents**:
   - Select the agent that matches your need
   - Each agent has specialized knowledge
   - Better results for specific domains

4. **Request Artifacts**:
   - Ask for PDF/Word/Excel when you need downloadable files
   - Specify format preferences
   - Request diagrams for visual representation

## 🔐 Security

- All processing is client-side
- API keys stored securely
- No data sent to unauthorized servers
- Automatic cleanup of temporary files

## 📞 Support

### Common Issues:

**"API Key Exhausted"**:
- Add new API key in Settings
- Use Groq API (higher limits)
- Wait for quota reset

**"Model Not Responding"**:
- Try different model
- Check API key validity
- Use fallback models

**"PDF Generation Failed"**:
- Check browser console
- Try simpler content first
- Ensure no ad blockers interfering

---

## ✅ Quick Checklist

Before using:
- [ ] Dependencies installed (`npm install`)
- [ ] Server running (`npm run dev`)
- [ ] API keys configured in `.env.local`
- [ ] Browser opened to `http://localhost:3002`

For PDF generation:
- [ ] Ask AI to create report/document
- [ ] Wait for PDF code block to appear
- [ ] Click "Download PDF" button
- [ ] Check downloads folder

For comprehensive answers:
- [ ] Select appropriate specialist agent
- [ ] Provide specific, detailed question
- [ ] Include relevant context
- [ ] Review complete response

---

**Version**: 2.0.0  
**Last Updated**: 2026-05-24  
**Status**: Production Ready  
**Support**: Check documentation files for detailed information

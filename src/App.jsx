import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

// ─── Smart API caller: tries serverless proxy first, then direct API ──────
async function callClaudeAPI({ system, messages, max_tokens }) {
  // Attempt 1: Vercel serverless proxy (works on deployed site)
  try {
    const r1 = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, max_tokens }),
    });
    if (r1.ok) {
      const d1 = await r1.json();
      if (d1.content) return d1;
    }
  } catch (e) { /* proxy not available, try direct */ }

  // Attempt 2: Direct Anthropic API (works in Claude artifact environment)
  try {
    const r2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: max_tokens || 2000,
        system: system || "",
        messages: messages || [],
      }),
    });
    if (r2.ok) {
      const d2 = await r2.json();
      if (d2.content) return d2;
    }
  } catch (e) { /* direct API also failed */ }

  throw new Error("Both API paths failed");
}

// ─── Embedded BLS OEWS Salary Data (comprehensive, all industries) ────────────────
const BLS_DATA = [
  // ── Management ──
  { occ_code: "11-1011", title: "Chief Executives", a_pct10: 82190, a_pct25: 130920, a_median: 189520, a_pct75: 239200, a_pct90: 239200, group: "Management" },
  { occ_code: "11-1021", title: "General and Operations Managers", a_pct10: 47800, a_pct25: 64200, a_median: 98100, a_pct75: 155760, a_pct90: 208000, group: "Management" },
  { occ_code: "11-2011", title: "Advertising and Promotions Managers", a_pct10: 58030, a_pct25: 82780, a_median: 131870, a_pct75: 183430, a_pct90: 239200, group: "Management" },
  { occ_code: "11-2021", title: "Marketing Managers", a_pct10: 73950, a_pct25: 101310, a_median: 140040, a_pct75: 192590, a_pct90: 239200, group: "Management" },
  { occ_code: "11-2022", title: "Sales Managers", a_pct10: 61090, a_pct25: 86110, a_median: 130600, a_pct75: 185200, a_pct90: 239200, group: "Management" },
  { occ_code: "11-2031", title: "Public Relations Managers", a_pct10: 62920, a_pct25: 85310, a_median: 125780, a_pct75: 172060, a_pct90: 218740, group: "Management" },
  { occ_code: "11-3013", title: "Facilities Managers", a_pct10: 54950, a_pct25: 72350, a_median: 99030, a_pct75: 131840, a_pct90: 170710, group: "Management" },
  { occ_code: "11-3021", title: "Computer and Information Systems Managers", a_pct10: 89050, a_pct25: 119180, a_median: 164070, a_pct75: 212230, a_pct90: 239200, group: "Management" },
  { occ_code: "11-3031", title: "Financial Managers", a_pct10: 75530, a_pct25: 100550, a_median: 139790, a_pct75: 199210, a_pct90: 239200, group: "Management" },
  { occ_code: "11-3051", title: "Industrial Production Managers", a_pct10: 63200, a_pct25: 81880, a_median: 107560, a_pct75: 140290, a_pct90: 176740, group: "Management" },
  { occ_code: "11-3061", title: "Purchasing Managers", a_pct10: 67000, a_pct25: 89100, a_median: 127150, a_pct75: 168400, a_pct90: 206070, group: "Management" },
  { occ_code: "11-3071", title: "Transportation and Distribution Managers", a_pct10: 58020, a_pct25: 77030, a_median: 105580, a_pct75: 139080, a_pct90: 175770, group: "Management" },
  { occ_code: "11-3111", title: "Compensation and Benefits Managers", a_pct10: 76960, a_pct25: 99840, a_median: 131280, a_pct75: 170490, a_pct90: 212690, group: "Management" },
  { occ_code: "11-3121", title: "Human Resources Managers", a_pct10: 76930, a_pct25: 101560, a_median: 130000, a_pct75: 171820, a_pct90: 220660, group: "Management" },
  { occ_code: "11-3131", title: "Training and Development Managers", a_pct10: 66590, a_pct25: 87100, a_median: 120000, a_pct75: 158110, a_pct90: 207420, group: "Management" },
  { occ_code: "11-9021", title: "Construction Managers", a_pct10: 60100, a_pct25: 76790, a_median: 101480, a_pct75: 135280, a_pct90: 177420, group: "Management" },
  { occ_code: "11-9041", title: "Architectural and Engineering Managers", a_pct10: 90780, a_pct25: 118420, a_median: 152350, a_pct75: 195150, a_pct90: 225600, group: "Management" },
  { occ_code: "11-9051", title: "Food Service Managers", a_pct10: 35220, a_pct25: 42910, a_median: 61310, a_pct75: 81560, a_pct90: 101010, group: "Management" },
  { occ_code: "11-9111", title: "Medical and Health Services Managers", a_pct10: 64100, a_pct25: 81270, a_median: 104830, a_pct75: 142600, a_pct90: 195630, group: "Management" },
  { occ_code: "11-9121", title: "Natural Sciences Managers", a_pct10: 80950, a_pct25: 109060, a_median: 137900, a_pct75: 181100, a_pct90: 222370, group: "Management" },
  { occ_code: "11-9141", title: "Property and Real Estate Managers", a_pct10: 30380, a_pct25: 39480, a_median: 59230, a_pct75: 89400, a_pct90: 134900, group: "Management" },
  { occ_code: "11-9151", title: "Social and Community Service Managers", a_pct10: 41370, a_pct25: 53180, a_median: 74000, a_pct75: 99060, a_pct90: 127080, group: "Management" },
  { occ_code: "11-9198", title: "Personal Service Managers, All Other", a_pct10: 31370, a_pct25: 38180, a_median: 55820, a_pct75: 82960, a_pct90: 120490, group: "Management" },
  { occ_code: "PM-0001", title: "Product Manager", a_pct10: 65000, a_pct25: 90000, a_median: 125000, a_pct75: 160000, a_pct90: 200000, group: "Management" },
  { occ_code: "PM-0002", title: "Program Manager", a_pct10: 60000, a_pct25: 80000, a_median: 110000, a_pct75: 145000, a_pct90: 180000, group: "Management" },
  { occ_code: "BIZ-0010", title: "Business Owner", a_pct10: 30000, a_pct25: 50000, a_median: 80000, a_pct75: 135000, a_pct90: 220000, group: "Management" },
  { occ_code: "BIZ-0011", title: "Entrepreneur", a_pct10: 25000, a_pct25: 45000, a_median: 75000, a_pct75: 130000, a_pct90: 250000, group: "Management" },
  { occ_code: "BIZ-0012", title: "Franchise Owner", a_pct10: 35000, a_pct25: 55000, a_median: 85000, a_pct75: 150000, a_pct90: 250000, group: "Management" },
  // ── Business and Financial ──
  { occ_code: "13-1011", title: "Agents and Business Managers of Artists and Athletes", a_pct10: 38790, a_pct25: 50460, a_median: 78270, a_pct75: 121050, a_pct90: 208000, group: "Business and Financial" },
  { occ_code: "13-1041", title: "Compliance Officers", a_pct10: 42440, a_pct25: 56300, a_median: 75810, a_pct75: 101120, a_pct90: 131160, group: "Business and Financial" },
  { occ_code: "13-1051", title: "Cost Estimators", a_pct10: 40850, a_pct25: 51610, a_median: 71200, a_pct75: 93890, a_pct90: 120530, group: "Business and Financial" },
  { occ_code: "13-1071", title: "Human Resources Specialists", a_pct10: 38820, a_pct25: 48440, a_median: 64240, a_pct75: 84070, a_pct90: 107210, group: "Business and Financial" },
  { occ_code: "13-1075", title: "Labor Relations Specialists", a_pct10: 40420, a_pct25: 53120, a_median: 77010, a_pct75: 109710, a_pct90: 136750, group: "Business and Financial" },
  { occ_code: "13-1081", title: "Logisticians", a_pct10: 48150, a_pct25: 60310, a_median: 77520, a_pct75: 99780, a_pct90: 126930, group: "Business and Financial" },
  { occ_code: "13-1082", title: "Project Management Specialists", a_pct10: 48890, a_pct25: 65740, a_median: 94500, a_pct75: 127690, a_pct90: 163680, group: "Business and Financial" },
  { occ_code: "13-1111", title: "Management Analysts", a_pct10: 50060, a_pct25: 67020, a_median: 95290, a_pct75: 135530, a_pct90: 179010, group: "Business and Financial" },
  { occ_code: "13-1121", title: "Meeting and Convention Planners", a_pct10: 31370, a_pct25: 39270, a_median: 52560, a_pct75: 69180, a_pct90: 96640, group: "Business and Financial" },
  { occ_code: "13-1131", title: "Fundraisers", a_pct10: 37940, a_pct25: 47570, a_median: 61190, a_pct75: 80540, a_pct90: 105720, group: "Business and Financial" },
  { occ_code: "13-1151", title: "Training and Development Specialists", a_pct10: 35510, a_pct25: 46180, a_median: 63080, a_pct75: 84520, a_pct90: 109650, group: "Business and Financial" },
  { occ_code: "13-1161", title: "Market Research Analysts", a_pct10: 38040, a_pct25: 48830, a_median: 68230, a_pct75: 97050, a_pct90: 131850, group: "Business and Financial" },
  { occ_code: "13-1199", title: "Business Operations Specialists, All Other", a_pct10: 38290, a_pct25: 52120, a_median: 79370, a_pct75: 107080, a_pct90: 136280, group: "Business and Financial" },
  { occ_code: "13-2011", title: "Accountants and Auditors", a_pct10: 44590, a_pct25: 57650, a_median: 79880, a_pct75: 103630, a_pct90: 132690, group: "Business and Financial" },
  { occ_code: "13-2023", title: "Appraisers and Assessors of Real Estate", a_pct10: 32030, a_pct25: 40700, a_median: 57010, a_pct75: 79260, a_pct90: 107000, group: "Business and Financial" },
  { occ_code: "13-2031", title: "Budget Analysts", a_pct10: 50840, a_pct25: 63500, a_median: 82260, a_pct75: 103400, a_pct90: 128500, group: "Business and Financial" },
  { occ_code: "13-2041", title: "Credit Analysts", a_pct10: 41100, a_pct25: 53970, a_median: 77190, a_pct75: 106370, a_pct90: 154290, group: "Business and Financial" },
  { occ_code: "13-2051", title: "Financial Analysts", a_pct10: 48990, a_pct25: 64430, a_median: 95080, a_pct75: 137480, a_pct90: 192350, group: "Business and Financial" },
  { occ_code: "13-2052", title: "Personal Financial Advisors", a_pct10: 40300, a_pct25: 56140, a_median: 94170, a_pct75: 163870, a_pct90: 239200, group: "Business and Financial" },
  { occ_code: "13-2053", title: "Insurance Underwriters", a_pct10: 45330, a_pct25: 55910, a_median: 76390, a_pct75: 103120, a_pct90: 132580, group: "Business and Financial" },
  { occ_code: "13-2054", title: "Financial Risk Specialists", a_pct10: 49810, a_pct25: 65270, a_median: 93910, a_pct75: 137000, a_pct90: 180000, group: "Business and Financial" },
  { occ_code: "13-2061", title: "Financial Examiners", a_pct10: 51770, a_pct25: 66990, a_median: 91500, a_pct75: 124490, a_pct90: 162300, group: "Business and Financial" },
  { occ_code: "13-2072", title: "Loan Officers", a_pct10: 33310, a_pct25: 44210, a_median: 63380, a_pct75: 98780, a_pct90: 144620, group: "Business and Financial" },
  { occ_code: "13-2082", title: "Tax Preparers", a_pct10: 23710, a_pct25: 29690, a_median: 43080, a_pct75: 61900, a_pct90: 82380, group: "Business and Financial" },
  { occ_code: "BA-0001", title: "Business Analyst", a_pct10: 45000, a_pct25: 58000, a_median: 78000, a_pct75: 100000, a_pct90: 125000, group: "Business and Financial" },
  { occ_code: "CONSULT-1", title: "Management Consultant", a_pct10: 55000, a_pct25: 75000, a_median: 105000, a_pct75: 145000, a_pct90: 190000, group: "Business and Financial" },
  { occ_code: "BIZ-0001", title: "Supply Chain Manager", a_pct10: 58000, a_pct25: 76000, a_median: 100000, a_pct75: 130000, a_pct90: 165000, group: "Business and Financial" },
  { occ_code: "BIZ-0002", title: "Operations Analyst", a_pct10: 42000, a_pct25: 55000, a_median: 72000, a_pct75: 92000, a_pct90: 115000, group: "Business and Financial" },
  // ── Computer and Mathematical ──
  { occ_code: "15-1211", title: "Computer Systems Analysts", a_pct10: 52520, a_pct25: 69100, a_median: 99270, a_pct75: 126420, a_pct90: 155010, group: "Computer and Mathematical" },
  { occ_code: "15-1221", title: "Computer and Information Security Analysts", a_pct10: 59410, a_pct25: 79760, a_median: 112000, a_pct75: 147350, a_pct90: 182000, group: "Computer and Mathematical" },
  { occ_code: "15-1231", title: "Computer Network Support Specialists", a_pct10: 39010, a_pct25: 48500, a_median: 67270, a_pct75: 85430, a_pct90: 106870, group: "Computer and Mathematical" },
  { occ_code: "15-1232", title: "Computer User Support Specialists", a_pct10: 33090, a_pct25: 41870, a_median: 57890, a_pct75: 73320, a_pct90: 91340, group: "Computer and Mathematical" },
  { occ_code: "15-1241", title: "Computer Network Architects", a_pct10: 66510, a_pct25: 86510, a_median: 120520, a_pct75: 157510, a_pct90: 197530, group: "Computer and Mathematical" },
  { occ_code: "15-1244", title: "Network and Computer Systems Administrators", a_pct10: 49550, a_pct25: 63400, a_median: 90520, a_pct75: 115000, a_pct90: 141590, group: "Computer and Mathematical" },
  { occ_code: "15-1245", title: "Database Administrators and Architects", a_pct10: 54850, a_pct25: 74180, a_median: 101510, a_pct75: 130550, a_pct90: 161980, group: "Computer and Mathematical" },
  { occ_code: "15-1251", title: "Computer Programmers", a_pct10: 48020, a_pct25: 62310, a_median: 97800, a_pct75: 130330, a_pct90: 155010, group: "Computer and Mathematical" },
  { occ_code: "15-1252", title: "Software Developers", a_pct10: 65210, a_pct25: 85660, a_median: 127260, a_pct75: 162410, a_pct90: 197250, group: "Computer and Mathematical" },
  { occ_code: "15-1253", title: "Software Quality Assurance Analysts and Testers", a_pct10: 47250, a_pct25: 64530, a_median: 98220, a_pct75: 123170, a_pct90: 153120, group: "Computer and Mathematical" },
  { occ_code: "15-1254", title: "Web Developers", a_pct10: 38550, a_pct25: 51340, a_median: 78580, a_pct75: 107720, a_pct90: 146520, group: "Computer and Mathematical" },
  { occ_code: "15-1255", title: "Web and Digital Interface Designers", a_pct10: 39550, a_pct25: 55070, a_median: 79890, a_pct75: 108600, a_pct90: 142800, group: "Computer and Mathematical" },
  { occ_code: "15-1299", title: "Computer Occupations, All Other", a_pct10: 45650, a_pct25: 60750, a_median: 89800, a_pct75: 120530, a_pct90: 150060, group: "Computer and Mathematical" },
  { occ_code: "15-2031", title: "Operations Research Analysts", a_pct10: 47930, a_pct25: 63260, a_median: 83640, a_pct75: 116730, a_pct90: 156900, group: "Computer and Mathematical" },
  { occ_code: "15-2041", title: "Statisticians", a_pct10: 52700, a_pct25: 68760, a_median: 95570, a_pct75: 126730, a_pct90: 157300, group: "Computer and Mathematical" },
  { occ_code: "15-2051", title: "Data Scientists", a_pct10: 59430, a_pct25: 80100, a_median: 108020, a_pct75: 141300, a_pct90: 174790, group: "Computer and Mathematical" },
  { occ_code: "DATA-0001", title: "Data Analyst", a_pct10: 45000, a_pct25: 57000, a_median: 72000, a_pct75: 92000, a_pct90: 115000, group: "Computer and Mathematical" },
  { occ_code: "DATA-0002", title: "Data Engineer", a_pct10: 68000, a_pct25: 85000, a_median: 112000, a_pct75: 140000, a_pct90: 168000, group: "Computer and Mathematical" },
  { occ_code: "ML-0001", title: "Machine Learning Engineer", a_pct10: 80000, a_pct25: 105000, a_median: 138000, a_pct75: 175000, a_pct90: 210000, group: "Computer and Mathematical" },
  { occ_code: "AI-0001", title: "AI Research Scientist", a_pct10: 90000, a_pct25: 120000, a_median: 155000, a_pct75: 200000, a_pct90: 250000, group: "Computer and Mathematical" },
  { occ_code: "DEVOPS-01", title: "DevOps Engineer", a_pct10: 65000, a_pct25: 85000, a_median: 115000, a_pct75: 145000, a_pct90: 175000, group: "Computer and Mathematical" },
  { occ_code: "CLOUD-01", title: "Cloud Engineer", a_pct10: 70000, a_pct25: 92000, a_median: 120000, a_pct75: 152000, a_pct90: 185000, group: "Computer and Mathematical" },
  // ── Architecture and Engineering ──
  { occ_code: "17-1011", title: "Architects", a_pct10: 49950, a_pct25: 63420, a_median: 82840, a_pct75: 107400, a_pct90: 136310, group: "Architecture and Engineering" },
  { occ_code: "17-2011", title: "Aerospace Engineers", a_pct10: 77440, a_pct25: 95950, a_median: 122270, a_pct75: 155240, a_pct90: 190000, group: "Architecture and Engineering" },
  { occ_code: "17-2041", title: "Chemical Engineers", a_pct10: 68430, a_pct25: 82290, a_median: 105550, a_pct75: 135960, a_pct90: 171840, group: "Architecture and Engineering" },
  { occ_code: "17-2051", title: "Civil Engineers", a_pct10: 59380, a_pct25: 72440, a_median: 89940, a_pct75: 115110, a_pct90: 144560, group: "Architecture and Engineering" },
  { occ_code: "17-2071", title: "Electrical Engineers", a_pct10: 65370, a_pct25: 81120, a_median: 104610, a_pct75: 133120, a_pct90: 166570, group: "Architecture and Engineering" },
  { occ_code: "17-2081", title: "Environmental Engineers", a_pct10: 57750, a_pct25: 72070, a_median: 96530, a_pct75: 123870, a_pct90: 155960, group: "Architecture and Engineering" },
  { occ_code: "17-2112", title: "Industrial Engineers", a_pct10: 57610, a_pct25: 72020, a_median: 95300, a_pct75: 119020, a_pct90: 145500, group: "Architecture and Engineering" },
  { occ_code: "17-2141", title: "Mechanical Engineers", a_pct10: 60540, a_pct25: 73600, a_median: 95300, a_pct75: 118520, a_pct90: 146250, group: "Architecture and Engineering" },
  { occ_code: "17-2199", title: "Engineers, All Other", a_pct10: 61040, a_pct25: 78290, a_median: 101340, a_pct75: 131290, a_pct90: 168040, group: "Architecture and Engineering" },
  { occ_code: "17-3011", title: "Architectural and Civil Drafters", a_pct10: 36180, a_pct25: 44190, a_median: 57620, a_pct75: 73290, a_pct90: 89700, group: "Architecture and Engineering" },
  { occ_code: "17-3026", title: "Industrial Engineering Technicians", a_pct10: 37490, a_pct25: 46280, a_median: 60220, a_pct75: 76660, a_pct90: 95500, group: "Architecture and Engineering" },
  // ── Life, Physical, and Social Science ──
  { occ_code: "19-1012", title: "Food Scientists and Technologists", a_pct10: 44870, a_pct25: 55310, a_median: 79890, a_pct75: 105230, a_pct90: 135060, group: "Life, Physical, and Social Science" },
  { occ_code: "19-1013", title: "Soil and Plant Scientists", a_pct10: 40680, a_pct25: 50120, a_median: 65230, a_pct75: 85570, a_pct90: 113010, group: "Life, Physical, and Social Science" },
  { occ_code: "19-1042", title: "Medical Scientists", a_pct10: 46560, a_pct25: 61600, a_median: 99930, a_pct75: 133260, a_pct90: 173800, group: "Life, Physical, and Social Science" },
  { occ_code: "19-2012", title: "Physicists", a_pct10: 70210, a_pct25: 95390, a_median: 142850, a_pct75: 190610, a_pct90: 222590, group: "Life, Physical, and Social Science" },
  { occ_code: "19-2031", title: "Chemists", a_pct10: 45840, a_pct25: 57640, a_median: 80680, a_pct75: 108830, a_pct90: 140150, group: "Life, Physical, and Social Science" },
  { occ_code: "19-2041", title: "Environmental Scientists and Geoscientists", a_pct10: 49780, a_pct25: 61130, a_median: 78980, a_pct75: 102300, a_pct90: 133610, group: "Life, Physical, and Social Science" },
  { occ_code: "19-3011", title: "Economists", a_pct10: 62350, a_pct25: 82010, a_median: 113940, a_pct75: 156400, a_pct90: 198230, group: "Life, Physical, and Social Science" },
  { occ_code: "19-3031", title: "Clinical and Counseling Psychologists", a_pct10: 49140, a_pct25: 64650, a_median: 90130, a_pct75: 112900, a_pct90: 141690, group: "Life, Physical, and Social Science" },
  { occ_code: "19-3051", title: "Urban and Regional Planners", a_pct10: 46120, a_pct25: 57670, a_median: 78500, a_pct75: 101510, a_pct90: 127510, group: "Life, Physical, and Social Science" },
  { occ_code: "19-4099", title: "Life, Physical, and Social Science Technicians", a_pct10: 30330, a_pct25: 37600, a_median: 49260, a_pct75: 65100, a_pct90: 82990, group: "Life, Physical, and Social Science" },
  // ── Community and Social Service ──
  { occ_code: "21-1012", title: "Educational and Career Counselors", a_pct10: 35120, a_pct25: 43300, a_median: 60510, a_pct75: 80600, a_pct90: 99950, group: "Community and Social Service" },
  { occ_code: "21-1013", title: "Marriage and Family Therapists", a_pct10: 33940, a_pct25: 40900, a_median: 56570, a_pct75: 74780, a_pct90: 97610, group: "Community and Social Service" },
  { occ_code: "21-1014", title: "Mental Health Counselors", a_pct10: 30710, a_pct25: 37520, a_median: 49710, a_pct75: 67640, a_pct90: 86750, group: "Community and Social Service" },
  { occ_code: "21-1021", title: "Child and Family Social Workers", a_pct10: 33550, a_pct25: 39300, a_median: 50820, a_pct75: 64900, a_pct90: 78120, group: "Community and Social Service" },
  { occ_code: "21-1023", title: "Mental Health and Substance Abuse Social Workers", a_pct10: 30870, a_pct25: 37330, a_median: 51240, a_pct75: 66340, a_pct90: 80120, group: "Community and Social Service" },
  { occ_code: "21-1091", title: "Health Education Specialists", a_pct10: 34140, a_pct25: 41590, a_median: 59990, a_pct75: 76690, a_pct90: 100690, group: "Community and Social Service" },
  // ── Legal ──
  { occ_code: "23-1011", title: "Lawyers", a_pct10: 65000, a_pct25: 83040, a_median: 135740, a_pct75: 199000, a_pct90: 239200, group: "Legal" },
  { occ_code: "23-1012", title: "Judicial Law Clerks", a_pct10: 40710, a_pct25: 49480, a_median: 61940, a_pct75: 82560, a_pct90: 109590, group: "Legal" },
  { occ_code: "23-2011", title: "Paralegals and Legal Assistants", a_pct10: 35450, a_pct25: 42210, a_median: 59200, a_pct75: 76480, a_pct90: 95690, group: "Legal" },
  { occ_code: "23-2099", title: "Legal Support Workers, All Other", a_pct10: 30880, a_pct25: 38570, a_median: 55670, a_pct75: 72500, a_pct90: 90120, group: "Legal" },
  { occ_code: "LEGAL-01", title: "Corporate Counsel", a_pct10: 85000, a_pct25: 115000, a_median: 160000, a_pct75: 210000, a_pct90: 250000, group: "Legal" },
  { occ_code: "LEGAL-02", title: "Legal Compliance Specialist", a_pct10: 45000, a_pct25: 58000, a_median: 78000, a_pct75: 100000, a_pct90: 128000, group: "Legal" },
  // ── Education ──
  { occ_code: "25-1011", title: "Business Teachers, Postsecondary", a_pct10: 39700, a_pct25: 60440, a_median: 95940, a_pct75: 149570, a_pct90: 204850, group: "Education" },
  { occ_code: "25-1021", title: "Computer Science Teachers, Postsecondary", a_pct10: 38810, a_pct25: 60460, a_median: 90200, a_pct75: 134600, a_pct90: 183240, group: "Education" },
  { occ_code: "25-1022", title: "Mathematical Science Teachers, Postsecondary", a_pct10: 38030, a_pct25: 53870, a_median: 76860, a_pct75: 109350, a_pct90: 151770, group: "Education" },
  { occ_code: "25-2011", title: "Preschool Teachers", a_pct10: 23110, a_pct25: 27440, a_median: 35330, a_pct75: 46520, a_pct90: 59850, group: "Education" },
  { occ_code: "25-2012", title: "Kindergarten Teachers", a_pct10: 35630, a_pct25: 44740, a_median: 60660, a_pct75: 77480, a_pct90: 95730, group: "Education" },
  { occ_code: "25-2021", title: "Elementary School Teachers", a_pct10: 38720, a_pct25: 47050, a_median: 60660, a_pct75: 77480, a_pct90: 98590, group: "Education" },
  { occ_code: "25-2022", title: "Middle School Teachers", a_pct10: 39120, a_pct25: 47990, a_median: 61320, a_pct75: 79000, a_pct90: 100380, group: "Education" },
  { occ_code: "25-2031", title: "Secondary School Teachers", a_pct10: 40800, a_pct25: 49500, a_median: 62360, a_pct75: 80740, a_pct90: 101590, group: "Education" },
  { occ_code: "25-2032", title: "Special Education Teachers", a_pct10: 38230, a_pct25: 47470, a_median: 61820, a_pct75: 80560, a_pct90: 100830, group: "Education" },
  { occ_code: "25-2059", title: "Tutors and Teachers, All Other", a_pct10: 23530, a_pct25: 28160, a_median: 38200, a_pct75: 55060, a_pct90: 74510, group: "Education" },
  { occ_code: "25-3021", title: "Self-Enrichment Teachers", a_pct10: 22840, a_pct25: 28610, a_median: 42230, a_pct75: 64010, a_pct90: 89300, group: "Education" },
  { occ_code: "25-4022", title: "Librarians and Media Collections Specialists", a_pct10: 37260, a_pct25: 46490, a_median: 61190, a_pct75: 77300, a_pct90: 96120, group: "Education" },
  { occ_code: "25-9031", title: "Instructional Designers", a_pct10: 38250, a_pct25: 49900, a_median: 68480, a_pct75: 89720, a_pct90: 113380, group: "Education" },
  // ── Arts, Design, Entertainment, Sports, Media ──
  { occ_code: "27-1011", title: "Art Directors", a_pct10: 51380, a_pct25: 70960, a_median: 105180, a_pct75: 148840, a_pct90: 198100, group: "Arts, Design, Entertainment" },
  { occ_code: "27-1013", title: "Fine Artists", a_pct10: 26090, a_pct25: 35320, a_median: 52340, a_pct75: 77060, a_pct90: 107150, group: "Arts, Design, Entertainment" },
  { occ_code: "27-1014", title: "Special Effects Artists and Animators", a_pct10: 44340, a_pct25: 58490, a_median: 78790, a_pct75: 107640, a_pct90: 138400, group: "Arts, Design, Entertainment" },
  { occ_code: "27-1021", title: "Commercial and Industrial Designers", a_pct10: 44470, a_pct25: 56560, a_median: 74720, a_pct75: 97370, a_pct90: 123380, group: "Arts, Design, Entertainment" },
  { occ_code: "27-1024", title: "Graphic Designers", a_pct10: 33160, a_pct25: 40750, a_median: 57990, a_pct75: 74200, a_pct90: 98090, group: "Arts, Design, Entertainment" },
  { occ_code: "27-1025", title: "Interior Designers", a_pct10: 32820, a_pct25: 41280, a_median: 60340, a_pct75: 83360, a_pct90: 107000, group: "Arts, Design, Entertainment" },
  { occ_code: "27-1027", title: "Set and Exhibit Designers", a_pct10: 29600, a_pct25: 39400, a_median: 54470, a_pct75: 79300, a_pct90: 106340, group: "Arts, Design, Entertainment" },
  { occ_code: "27-2011", title: "Actors", a_pct10: 30000, a_pct25: 36200, a_median: 52000, a_pct75: 100000, a_pct90: 208000, group: "Arts, Design, Entertainment" },
  { occ_code: "27-2012", title: "Producers and Directors", a_pct10: 37070, a_pct25: 51000, a_median: 79000, a_pct75: 127400, a_pct90: 184660, group: "Arts, Design, Entertainment" },
  { occ_code: "27-2022", title: "Coaches and Scouts", a_pct10: 22490, a_pct25: 28000, a_median: 38970, a_pct75: 60800, a_pct90: 94400, group: "Arts, Design, Entertainment" },
  { occ_code: "27-2041", title: "Music Directors and Composers", a_pct10: 26200, a_pct25: 37460, a_median: 57000, a_pct75: 82290, a_pct90: 118050, group: "Arts, Design, Entertainment" },
  { occ_code: "27-2042", title: "Musicians and Singers", a_pct10: 24720, a_pct25: 31650, a_median: 45970, a_pct75: 72900, a_pct90: 94330, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3011", title: "Broadcast Announcers and Radio DJs", a_pct10: 22050, a_pct25: 27520, a_median: 40020, a_pct75: 60400, a_pct90: 93430, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3023", title: "News Analysts, Reporters, and Journalists", a_pct10: 29510, a_pct25: 36630, a_median: 55960, a_pct75: 89110, a_pct90: 133130, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3031", title: "Public Relations Specialists", a_pct10: 35230, a_pct25: 44200, a_median: 62800, a_pct75: 88600, a_pct90: 124620, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3041", title: "Editors", a_pct10: 33500, a_pct25: 43100, a_median: 63350, a_pct75: 85250, a_pct90: 117060, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3042", title: "Technical Writers", a_pct10: 44450, a_pct25: 57420, a_median: 78060, a_pct75: 103810, a_pct90: 128030, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3043", title: "Writers and Authors", a_pct10: 29920, a_pct25: 40240, a_median: 69510, a_pct75: 101010, a_pct90: 133580, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3091", title: "Interpreters and Translators", a_pct10: 29430, a_pct25: 37630, a_median: 52330, a_pct75: 69810, a_pct90: 94370, group: "Arts, Design, Entertainment" },
  { occ_code: "27-3099", title: "Media and Communication Workers, All Other", a_pct10: 29410, a_pct25: 38560, a_median: 56160, a_pct75: 83330, a_pct90: 114810, group: "Arts, Design, Entertainment" },
  { occ_code: "27-4011", title: "Audio and Video Technicians", a_pct10: 27560, a_pct25: 35740, a_median: 50530, a_pct75: 71370, a_pct90: 94870, group: "Arts, Design, Entertainment" },
  { occ_code: "27-4021", title: "Photographers", a_pct10: 22930, a_pct25: 28330, a_median: 40070, a_pct75: 59840, a_pct90: 86100, group: "Arts, Design, Entertainment" },
  { occ_code: "27-4032", title: "Film and Video Editors", a_pct10: 31890, a_pct25: 40780, a_median: 62680, a_pct75: 97420, a_pct90: 141110, group: "Arts, Design, Entertainment" },
  { occ_code: "UX-0001", title: "UX Designer", a_pct10: 50000, a_pct25: 68000, a_median: 92000, a_pct75: 120000, a_pct90: 148000, group: "Arts, Design, Entertainment" },
  { occ_code: "UX-0002", title: "UX Researcher", a_pct10: 58000, a_pct25: 75000, a_median: 100000, a_pct75: 130000, a_pct90: 160000, group: "Arts, Design, Entertainment" },
  { occ_code: "MKTG-01", title: "Content Strategist", a_pct10: 40000, a_pct25: 52000, a_median: 72000, a_pct75: 95000, a_pct90: 120000, group: "Arts, Design, Entertainment" },
  { occ_code: "MKTG-02", title: "Social Media Manager", a_pct10: 35000, a_pct25: 44000, a_median: 61000, a_pct75: 80000, a_pct90: 102000, group: "Arts, Design, Entertainment" },
  { occ_code: "MKTG-03", title: "Copywriter", a_pct10: 33000, a_pct25: 42000, a_median: 58000, a_pct75: 78000, a_pct90: 105000, group: "Arts, Design, Entertainment" },
  { occ_code: "MKTG-04", title: "Brand Manager", a_pct10: 55000, a_pct25: 72000, a_median: 98000, a_pct75: 130000, a_pct90: 170000, group: "Arts, Design, Entertainment" },
  // ── Healthcare Practitioners ──
  { occ_code: "29-1011", title: "Chiropractors", a_pct10: 36850, a_pct25: 52160, a_median: 75380, a_pct75: 107780, a_pct90: 153810, group: "Healthcare Practitioners" },
  { occ_code: "29-1021", title: "Dentists, General", a_pct10: 79060, a_pct25: 113320, a_median: 160370, a_pct75: 239200, a_pct90: 239200, group: "Healthcare Practitioners" },
  { occ_code: "29-1031", title: "Dietitians and Nutritionists", a_pct10: 39430, a_pct25: 48650, a_median: 66450, a_pct75: 82600, a_pct90: 99110, group: "Healthcare Practitioners" },
  { occ_code: "29-1051", title: "Pharmacists", a_pct10: 79440, a_pct25: 112470, a_median: 132750, a_pct75: 151640, a_pct90: 168460, group: "Healthcare Practitioners" },
  { occ_code: "29-1071", title: "Physician Assistants", a_pct10: 78670, a_pct25: 97690, a_median: 121530, a_pct75: 150110, a_pct90: 169280, group: "Healthcare Practitioners" },
  { occ_code: "29-1122", title: "Occupational Therapists", a_pct10: 60470, a_pct25: 72440, a_median: 92560, a_pct75: 107000, a_pct90: 125470, group: "Healthcare Practitioners" },
  { occ_code: "29-1123", title: "Physical Therapists", a_pct10: 63400, a_pct25: 75690, a_median: 97720, a_pct75: 113010, a_pct90: 127110, group: "Healthcare Practitioners" },
  { occ_code: "29-1127", title: "Speech-Language Pathologists", a_pct10: 53190, a_pct25: 65240, a_median: 84140, a_pct75: 105230, a_pct90: 126680, group: "Healthcare Practitioners" },
  { occ_code: "29-1141", title: "Registered Nurses", a_pct10: 59450, a_pct25: 69680, a_median: 81220, a_pct75: 98160, a_pct90: 120250, group: "Healthcare Practitioners" },
  { occ_code: "29-1151", title: "Nurse Anesthetists", a_pct10: 126890, a_pct25: 157620, a_median: 195540, a_pct75: 232250, a_pct90: 239200, group: "Healthcare Practitioners" },
  { occ_code: "29-1171", title: "Nurse Practitioners", a_pct10: 83640, a_pct25: 100540, a_median: 121610, a_pct75: 146680, a_pct90: 168560, group: "Healthcare Practitioners" },
  { occ_code: "29-1228", title: "Physicians, All Other", a_pct10: 64170, a_pct25: 131420, a_median: 229300, a_pct75: 239200, a_pct90: 239200, group: "Healthcare Practitioners" },
  { occ_code: "29-1241", title: "Ophthalmologists and Optometrists", a_pct10: 64340, a_pct25: 87570, a_median: 124300, a_pct75: 167570, a_pct90: 214410, group: "Healthcare Practitioners" },
  { occ_code: "29-2010", title: "Clinical Laboratory Technologists and Technicians", a_pct10: 35100, a_pct25: 42620, a_median: 57380, a_pct75: 73800, a_pct90: 89830, group: "Healthcare Practitioners" },
  { occ_code: "29-2032", title: "Diagnostic Medical Sonographers", a_pct10: 57310, a_pct25: 67340, a_median: 80850, a_pct75: 98510, a_pct90: 109080, group: "Healthcare Practitioners" },
  { occ_code: "29-2034", title: "Radiologic Technologists and Technicians", a_pct10: 41810, a_pct25: 51020, a_median: 65140, a_pct75: 80400, a_pct90: 95160, group: "Healthcare Practitioners" },
  { occ_code: "29-2041", title: "Emergency Medical Technicians and Paramedics", a_pct10: 25930, a_pct25: 30840, a_median: 38930, a_pct75: 55000, a_pct90: 68420, group: "Healthcare Practitioners" },
  { occ_code: "29-2052", title: "Pharmacy Technicians", a_pct10: 27070, a_pct25: 30810, a_median: 37790, a_pct75: 45330, a_pct90: 50730, group: "Healthcare Practitioners" },
  { occ_code: "29-2061", title: "Licensed Practical and Licensed Vocational Nurses", a_pct10: 35150, a_pct25: 40050, a_median: 48070, a_pct75: 57490, a_pct90: 65510, group: "Healthcare Practitioners" },
  { occ_code: "29-1181", title: "Audiologists", a_pct10: 55480, a_pct25: 66470, a_median: 82680, a_pct75: 101650, a_pct90: 120880, group: "Healthcare Practitioners" },
  // ── Healthcare Support ──
  { occ_code: "31-1120", title: "Home Health and Personal Care Aides", a_pct10: 22080, a_pct25: 25090, a_median: 30180, a_pct75: 36160, a_pct90: 41440, group: "Healthcare Support" },
  { occ_code: "31-1131", title: "Nursing Assistants", a_pct10: 24900, a_pct25: 28020, a_median: 33250, a_pct75: 39510, a_pct90: 45800, group: "Healthcare Support" },
  { occ_code: "31-2021", title: "Physical Therapist Assistants", a_pct10: 37780, a_pct25: 44450, a_median: 61180, a_pct75: 72570, a_pct90: 81310, group: "Healthcare Support" },
  { occ_code: "31-9091", title: "Dental Assistants", a_pct10: 28210, a_pct25: 33150, a_median: 41170, a_pct75: 51150, a_pct90: 59690, group: "Healthcare Support" },
  { occ_code: "31-9092", title: "Medical Assistants", a_pct10: 27560, a_pct25: 31400, a_median: 37190, a_pct75: 44440, a_pct90: 51700, group: "Healthcare Support" },
  { occ_code: "31-9097", title: "Phlebotomists", a_pct10: 29000, a_pct25: 32580, a_median: 38530, a_pct75: 45920, a_pct90: 52900, group: "Healthcare Support" },
  // ── Protective Service ──
  { occ_code: "33-1012", title: "Fire Supervisors", a_pct10: 53050, a_pct25: 67460, a_median: 84370, a_pct75: 105590, a_pct90: 126030, group: "Protective Service" },
  { occ_code: "33-1021", title: "Police and Detective Supervisors", a_pct10: 54370, a_pct25: 71330, a_median: 99330, a_pct75: 126230, a_pct90: 153990, group: "Protective Service" },
  { occ_code: "33-2011", title: "Firefighters", a_pct10: 28500, a_pct25: 37470, a_median: 50700, a_pct75: 70750, a_pct90: 92070, group: "Protective Service" },
  { occ_code: "33-3012", title: "Correctional Officers", a_pct10: 30200, a_pct25: 36430, a_median: 47920, a_pct75: 64850, a_pct90: 79620, group: "Protective Service" },
  { occ_code: "33-3051", title: "Police and Sheriff's Patrol Officers", a_pct10: 37330, a_pct25: 47830, a_median: 65790, a_pct75: 84020, a_pct90: 102070, group: "Protective Service" },
  { occ_code: "33-9032", title: "Security Guards", a_pct10: 23900, a_pct25: 27290, a_median: 33150, a_pct75: 43240, a_pct90: 52490, group: "Protective Service" },
  // ── Food Preparation and Serving ──
  { occ_code: "35-1012", title: "Food Service Supervisors", a_pct10: 26020, a_pct25: 29790, a_median: 36570, a_pct75: 46890, a_pct90: 58620, group: "Food Preparation and Serving" },
  { occ_code: "35-1011", title: "Chefs and Head Cooks", a_pct10: 31250, a_pct25: 37980, a_median: 53380, a_pct75: 75260, a_pct90: 99060, group: "Food Preparation and Serving" },
  { occ_code: "35-2014", title: "Cooks, Restaurant", a_pct10: 23070, a_pct25: 26040, a_median: 31570, a_pct75: 38480, a_pct90: 44950, group: "Food Preparation and Serving" },
  { occ_code: "35-2015", title: "Cooks, Short Order", a_pct10: 21360, a_pct25: 24000, a_median: 28280, a_pct75: 33620, a_pct90: 38560, group: "Food Preparation and Serving" },
  { occ_code: "35-2021", title: "Food Preparation Workers", a_pct10: 21580, a_pct25: 23960, a_median: 28620, a_pct75: 33940, a_pct90: 38210, group: "Food Preparation and Serving" },
  { occ_code: "35-3023", title: "Fast Food and Counter Workers", a_pct10: 20510, a_pct25: 22060, a_median: 25920, a_pct75: 30550, a_pct90: 35600, group: "Food Preparation and Serving" },
  { occ_code: "35-3031", title: "Waiters and Waitresses", a_pct10: 18530, a_pct25: 21000, a_median: 27470, a_pct75: 37430, a_pct90: 46870, group: "Food Preparation and Serving" },
  { occ_code: "35-3041", title: "Bartenders", a_pct10: 18340, a_pct25: 20950, a_median: 27710, a_pct75: 38210, a_pct90: 52180, group: "Food Preparation and Serving" },
  { occ_code: "35-9011", title: "Dining Room and Cafeteria Attendants and Bartender Helpers", a_pct10: 19860, a_pct25: 22250, a_median: 27080, a_pct75: 32220, a_pct90: 37100, group: "Food Preparation and Serving" },
  // ── Building, Grounds, Maintenance ──
  { occ_code: "37-1011", title: "Housekeeping Supervisors", a_pct10: 26570, a_pct25: 32600, a_median: 43300, a_pct75: 57360, a_pct90: 71540, group: "Building and Grounds" },
  { occ_code: "37-2011", title: "Janitors and Cleaners", a_pct10: 22170, a_pct25: 25590, a_median: 31990, a_pct75: 40280, a_pct90: 47980, group: "Building and Grounds" },
  { occ_code: "37-3011", title: "Landscaping and Groundskeeping Workers", a_pct10: 24050, a_pct25: 27830, a_median: 34110, a_pct75: 42620, a_pct90: 50790, group: "Building and Grounds" },
  // ── Sales ──
  { occ_code: "41-1012", title: "Sales Supervisors, Retail", a_pct10: 28580, a_pct25: 33370, a_median: 42550, a_pct75: 57130, a_pct90: 76640, group: "Sales" },
  { occ_code: "41-2011", title: "Cashiers", a_pct10: 19140, a_pct25: 21410, a_median: 26260, a_pct75: 30780, a_pct90: 35930, group: "Sales" },
  { occ_code: "41-2031", title: "Retail Salespersons", a_pct10: 20440, a_pct25: 23310, a_median: 29180, a_pct75: 37780, a_pct90: 49220, group: "Sales" },
  { occ_code: "41-3011", title: "Advertising Sales Agents", a_pct10: 26520, a_pct25: 34600, a_median: 58450, a_pct75: 90040, a_pct90: 134500, group: "Sales" },
  { occ_code: "41-3021", title: "Insurance Sales Agents", a_pct10: 31090, a_pct25: 38220, a_median: 57860, a_pct75: 82170, a_pct90: 131020, group: "Sales" },
  { occ_code: "41-3031", title: "Securities and Financial Services Sales Agents", a_pct10: 37680, a_pct25: 50400, a_median: 76200, a_pct75: 138670, a_pct90: 239200, group: "Sales" },
  { occ_code: "41-3091", title: "Sales Representatives, Wholesale and Manufacturing", a_pct10: 32840, a_pct25: 45260, a_median: 65630, a_pct75: 99490, a_pct90: 149410, group: "Sales" },
  { occ_code: "41-4012", title: "Sales Representatives, Technical and Scientific", a_pct10: 39730, a_pct25: 57000, a_median: 97710, a_pct75: 147020, a_pct90: 200000, group: "Sales" },
  { occ_code: "41-9021", title: "Real Estate Brokers", a_pct10: 26530, a_pct25: 36370, a_median: 62010, a_pct75: 103400, a_pct90: 171130, group: "Sales" },
  { occ_code: "41-9022", title: "Real Estate Sales Agents", a_pct10: 23680, a_pct25: 30790, a_median: 48770, a_pct75: 78960, a_pct90: 119250, group: "Sales" },
  { occ_code: "SALES-01", title: "Account Executive", a_pct10: 40000, a_pct25: 55000, a_median: 75000, a_pct75: 110000, a_pct90: 160000, group: "Sales" },
  { occ_code: "SALES-02", title: "Business Development Representative", a_pct10: 35000, a_pct25: 42000, a_median: 55000, a_pct75: 72000, a_pct90: 95000, group: "Sales" },
  { occ_code: "SALES-03", title: "Sales Engineer", a_pct10: 58000, a_pct25: 78000, a_median: 108000, a_pct75: 145000, a_pct90: 185000, group: "Sales" },
  // ── Office and Administrative Support ──
  { occ_code: "43-1011", title: "Office Supervisors", a_pct10: 33490, a_pct25: 42410, a_median: 60670, a_pct75: 77510, a_pct90: 94400, group: "Office and Administrative Support" },
  { occ_code: "43-3011", title: "Bill and Account Collectors", a_pct10: 26590, a_pct25: 30890, a_median: 38280, a_pct75: 48220, a_pct90: 57580, group: "Office and Administrative Support" },
  { occ_code: "43-3021", title: "Billing and Posting Clerks", a_pct10: 28100, a_pct25: 32090, a_median: 38660, a_pct75: 46720, a_pct90: 55340, group: "Office and Administrative Support" },
  { occ_code: "43-3031", title: "Bookkeeping and Accounting Clerks", a_pct10: 28540, a_pct25: 33520, a_median: 42410, a_pct75: 53340, a_pct90: 64310, group: "Office and Administrative Support" },
  { occ_code: "43-4051", title: "Customer Service Representatives", a_pct10: 25540, a_pct25: 29960, a_median: 37780, a_pct75: 47590, a_pct90: 57640, group: "Office and Administrative Support" },
  { occ_code: "43-4171", title: "Receptionists and Information Clerks", a_pct10: 23490, a_pct25: 26770, a_median: 32410, a_pct75: 39330, a_pct90: 46200, group: "Office and Administrative Support" },
  { occ_code: "43-6011", title: "Executive Secretaries and Executive Administrative Assistants", a_pct10: 38070, a_pct25: 48710, a_median: 65980, a_pct75: 83240, a_pct90: 101200, group: "Office and Administrative Support" },
  { occ_code: "43-6014", title: "Secretaries and Administrative Assistants", a_pct10: 28830, a_pct25: 34280, a_median: 41790, a_pct75: 53200, a_pct90: 67160, group: "Office and Administrative Support" },
  { occ_code: "43-9061", title: "Office Clerks, General", a_pct10: 23730, a_pct25: 28010, a_median: 35350, a_pct75: 44990, a_pct90: 54010, group: "Office and Administrative Support" },
  // ── Construction and Extraction ──
  { occ_code: "47-1011", title: "Construction Supervisors", a_pct10: 43680, a_pct25: 55510, a_median: 73370, a_pct75: 95200, a_pct90: 118910, group: "Construction and Extraction" },
  { occ_code: "47-2031", title: "Carpenters", a_pct10: 32310, a_pct25: 38400, a_median: 51390, a_pct75: 66910, a_pct90: 83640, group: "Construction and Extraction" },
  { occ_code: "47-2061", title: "Construction Laborers", a_pct10: 27960, a_pct25: 32180, a_median: 39520, a_pct75: 52940, a_pct90: 68530, group: "Construction and Extraction" },
  { occ_code: "47-2073", title: "Operating Engineers and Heavy Equipment Operators", a_pct10: 32850, a_pct25: 40560, a_median: 52710, a_pct75: 69160, a_pct90: 85330, group: "Construction and Extraction" },
  { occ_code: "47-2111", title: "Electricians", a_pct10: 37020, a_pct25: 44980, a_median: 60240, a_pct75: 80470, a_pct90: 99800, group: "Construction and Extraction" },
  { occ_code: "47-2152", title: "Plumbers and Pipefitters", a_pct10: 34960, a_pct25: 42440, a_median: 59880, a_pct75: 79610, a_pct90: 98990, group: "Construction and Extraction" },
  { occ_code: "47-2211", title: "Sheet Metal Workers", a_pct10: 32080, a_pct25: 39730, a_median: 55080, a_pct75: 71900, a_pct90: 91630, group: "Construction and Extraction" },
  { occ_code: "47-2221", title: "Structural Iron and Steel Workers", a_pct10: 36990, a_pct25: 46790, a_median: 60090, a_pct75: 79960, a_pct90: 103830, group: "Construction and Extraction" },
  // ── Installation, Maintenance, Repair ──
  { occ_code: "49-1011", title: "Maintenance Supervisors", a_pct10: 41040, a_pct25: 52630, a_median: 69790, a_pct75: 91190, a_pct90: 113170, group: "Installation and Maintenance" },
  { occ_code: "49-3023", title: "Automotive Service Technicians", a_pct10: 27560, a_pct25: 33380, a_median: 44890, a_pct75: 60840, a_pct90: 75000, group: "Installation and Maintenance" },
  { occ_code: "49-3042", title: "Mobile Heavy Equipment Mechanics", a_pct10: 36040, a_pct25: 43680, a_median: 58260, a_pct75: 72210, a_pct90: 84940, group: "Installation and Maintenance" },
  { occ_code: "49-9021", title: "Heating and Air Conditioning Mechanics (HVAC)", a_pct10: 32950, a_pct25: 39810, a_median: 51390, a_pct75: 68780, a_pct90: 85530, group: "Installation and Maintenance" },
  { occ_code: "49-9041", title: "Industrial Machinery Mechanics", a_pct10: 38790, a_pct25: 46200, a_median: 57320, a_pct75: 71680, a_pct90: 85070, group: "Installation and Maintenance" },
  { occ_code: "49-9051", title: "Electrical Power-Line Installers and Repairers", a_pct10: 44580, a_pct25: 56840, a_median: 74410, a_pct75: 95200, a_pct90: 106030, group: "Installation and Maintenance" },
  { occ_code: "49-9071", title: "Maintenance and Repair Workers, General", a_pct10: 28190, a_pct25: 33400, a_median: 43180, a_pct75: 56250, a_pct90: 67990, group: "Installation and Maintenance" },
  // ── Production / Manufacturing ──
  { occ_code: "51-1011", title: "Production Supervisors", a_pct10: 36230, a_pct25: 46080, a_median: 62850, a_pct75: 81600, a_pct90: 102560, group: "Production" },
  { occ_code: "51-2098", title: "Assemblers and Fabricators, All Other", a_pct10: 24360, a_pct25: 28370, a_median: 34990, a_pct75: 42430, a_pct90: 49780, group: "Production" },
  { occ_code: "51-4041", title: "Machinists", a_pct10: 30900, a_pct25: 37150, a_median: 47940, a_pct75: 59850, a_pct90: 72490, group: "Production" },
  { occ_code: "51-4121", title: "Welders, Cutters, Solderers, and Brazers", a_pct10: 30270, a_pct25: 36200, a_median: 46690, a_pct75: 58750, a_pct90: 71080, group: "Production" },
  { occ_code: "51-9111", title: "Packaging and Filling Machine Operators", a_pct10: 23140, a_pct25: 27020, a_median: 33800, a_pct75: 42050, a_pct90: 49710, group: "Production" },
  // ── Transportation ──
  { occ_code: "53-1048", title: "Transportation Supervisors", a_pct10: 34100, a_pct25: 44500, a_median: 61130, a_pct75: 81210, a_pct90: 102550, group: "Transportation" },
  { occ_code: "53-2011", title: "Airline Pilots, Copilots, and Flight Engineers", a_pct10: 85620, a_pct25: 111710, a_median: 171210, a_pct75: 225660, a_pct90: 239200, group: "Transportation" },
  { occ_code: "53-3032", title: "Heavy and Tractor-Trailer Truck Drivers", a_pct10: 34470, a_pct25: 40620, a_median: 49920, a_pct75: 62070, a_pct90: 72880, group: "Transportation" },
  { occ_code: "53-3033", title: "Light Truck Drivers and Delivery Drivers", a_pct10: 24430, a_pct25: 29430, a_median: 38470, a_pct75: 50180, a_pct90: 61380, group: "Transportation" },
  { occ_code: "53-3054", title: "Bus Drivers, Transit and Intercity", a_pct10: 28100, a_pct25: 37400, a_median: 50410, a_pct75: 63970, a_pct90: 72020, group: "Transportation" },
  { occ_code: "53-4031", title: "Railroad Conductors and Yardmasters", a_pct10: 47370, a_pct25: 55650, a_median: 70560, a_pct75: 82600, a_pct90: 89110, group: "Transportation" },
  { occ_code: "53-6051", title: "Transportation Inspectors", a_pct10: 43770, a_pct25: 56740, a_median: 80190, a_pct75: 102660, a_pct90: 119440, group: "Transportation" },
  { occ_code: "53-7062", title: "Laborers and Material Movers, Hand", a_pct10: 23310, a_pct25: 26830, a_median: 33420, a_pct75: 40210, a_pct90: 46720, group: "Transportation" },
  // ── Personal Care and Service ──
  { occ_code: "39-1014", title: "Gambling Supervisors", a_pct10: 31480, a_pct25: 39250, a_median: 56540, a_pct75: 72210, a_pct90: 86720, group: "Personal Care and Service" },
  { occ_code: "39-2021", title: "Animal Caretakers", a_pct10: 21280, a_pct25: 23740, a_median: 29270, a_pct75: 36420, a_pct90: 42300, group: "Personal Care and Service" },
  { occ_code: "39-5012", title: "Hairdressers, Hairstylists, and Cosmetologists", a_pct10: 20510, a_pct25: 23050, a_median: 30220, a_pct75: 42250, a_pct90: 56100, group: "Personal Care and Service" },
  { occ_code: "39-5092", title: "Manicurists and Pedicurists", a_pct10: 20080, a_pct25: 22470, a_median: 30710, a_pct75: 39660, a_pct90: 48660, group: "Personal Care and Service" },
  { occ_code: "39-5094", title: "Skincare Specialists", a_pct10: 22230, a_pct25: 26310, a_median: 36510, a_pct75: 53690, a_pct90: 68720, group: "Personal Care and Service" },
  { occ_code: "39-9011", title: "Childcare Workers", a_pct10: 20500, a_pct25: 22480, a_median: 27490, a_pct75: 34620, a_pct90: 42350, group: "Personal Care and Service" },
  { occ_code: "39-9031", title: "Fitness Trainers and Aerobics Instructors", a_pct10: 22000, a_pct25: 25620, a_median: 40700, a_pct75: 62950, a_pct90: 78690, group: "Personal Care and Service" },
  { occ_code: "39-9032", title: "Recreation Workers", a_pct10: 20780, a_pct25: 24010, a_median: 31100, a_pct75: 40620, a_pct90: 52020, group: "Personal Care and Service" },
  // ── Farming, Fishing, Forestry ──
  { occ_code: "45-1011", title: "Farm and Ranch Managers", a_pct10: 36610, a_pct25: 50790, a_median: 73060, a_pct75: 108670, a_pct90: 147740, group: "Farming, Fishing, Forestry" },
  { occ_code: "45-2091", title: "Agricultural Equipment Operators", a_pct10: 24320, a_pct25: 28280, a_median: 34640, a_pct75: 43950, a_pct90: 56410, group: "Farming, Fishing, Forestry" },
  { occ_code: "45-2092", title: "Farmworkers and Laborers", a_pct10: 22270, a_pct25: 24810, a_median: 29710, a_pct75: 36210, a_pct90: 43070, group: "Farming, Fishing, Forestry" },
  { occ_code: "45-4011", title: "Forest and Conservation Workers", a_pct10: 24180, a_pct25: 28190, a_median: 35090, a_pct75: 47710, a_pct90: 56970, group: "Farming, Fishing, Forestry" },
];

// ─── Location cost-of-living multipliers ──────────────────────────────────
const LOCATION_MULTIPLIERS = {
  "San Francisco, CA": 1.35, "San Jose, CA": 1.30, "New York, NY": 1.33,
  "Los Angeles, CA": 1.18, "Seattle, WA": 1.22, "Boston, MA": 1.20,
  "Washington, DC": 1.18, "Chicago, IL": 1.05, "Austin, TX": 1.02,
  "Denver, CO": 1.06, "Portland, OR": 1.08, "Atlanta, GA": 0.98,
  "Dallas, TX": 0.97, "Houston, TX": 0.96, "Phoenix, AZ": 0.96,
  "Philadelphia, PA": 1.05, "Minneapolis, MN": 1.02, "Miami, FL": 1.10,
  "San Diego, CA": 1.20, "Detroit, MI": 0.90, "Nashville, TN": 0.97,
  "Raleigh, NC": 0.97, "Salt Lake City, UT": 0.98, "Remote": 1.00,
  "Other": 1.00,
};

// ─── Styles ───────────────────────────────────────────────────────────────
const fonts = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');
`;

const palette = {
  bg: "#0B0F1A",
  card: "#131825",
  cardBorder: "#1E2538",
  accent: "#3B82F6",
  accentDim: "#2563EB",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textDim: "#64748B",
  inputBg: "#0F1420",
  inputBorder: "#1E293B",
};

// ─── Main Component ──────────────────────────────────────────────────────
export default function SalaryOptimizationAdvisor() {
  const [step, setStep] = useState(0); // 0=input, 1=analyzing, 2=results
  const [formData, setFormData] = useState({
    jobTitle: "",
    currentSalary: "",
    location: "San Francisco, CA",
    yearsExperience: "",
    resumeText: "",
  });
  const [results, setResults] = useState(null);
  const [llmAnalysis, setLlmAnalysis] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);
  const [analysisMethod, setAnalysisMethod] = useState(null);
  const [animStage, setAnimStage] = useState(0);
  const fileInputRef = useRef(null);
  // Feature A: Career field switcher
  const [targetField, setTargetField] = useState("");
  const [switchAnalysis, setSwitchAnalysis] = useState(null);
  const [switchLoading, setSwitchLoading] = useState(false);
  // Feature B: Resume rewriter
  const [resumeRewrite, setResumeRewrite] = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  // Feature C: Job description targeting
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  // Feature D: Job search
  const [jobSearchResults, setJobSearchResults] = useState(null);
  const [jobSearchLoading, setJobSearchLoading] = useState(false);

  const allGroups = [...new Set(BLS_DATA.map(r => r.group))].sort();

  // ── Alias map: common job titles → BLS titles ──
  const ALIASES = {
    // Education
    "teacher": "Elementary School Teachers", "school teacher": "Elementary School Teachers",
    "high school teacher": "Secondary School Teachers", "math teacher": "Secondary School Teachers",
    "science teacher": "Secondary School Teachers", "english teacher": "Secondary School Teachers",
    "history teacher": "Secondary School Teachers", "middle school teacher": "Middle School Teachers",
    "preschool teacher": "Preschool Teachers", "kindergarten teacher": "Kindergarten Teachers",
    "special ed teacher": "Special Education Teachers", "substitute teacher": "Tutors and Teachers, All Other",
    "tutor": "Tutors and Teachers, All Other", "professor": "Business Teachers, Postsecondary",
    "college professor": "Business Teachers, Postsecondary", "instructor": "Self-Enrichment Teachers",
    "instructional designer": "Instructional Designers", "librarian": "Librarians and Media Collections Specialists",
    // Coaching / Sports
    "coach": "Coaches and Scouts", "coaching": "Coaches and Scouts", "sports coach": "Coaches and Scouts",
    "athletic coach": "Coaches and Scouts", "fitness coach": "Fitness Trainers and Aerobics Instructors",
    "personal trainer": "Fitness Trainers and Aerobics Instructors", "trainer": "Fitness Trainers and Aerobics Instructors",
    "scout": "Coaches and Scouts",
    // Tech
    "software engineer": "Software Developers", "swe": "Software Developers", "programmer": "Computer Programmers",
    "coder": "Computer Programmers", "developer": "Software Developers", "web dev": "Web Developers",
    "frontend developer": "Web Developers", "backend developer": "Software Developers",
    "full stack developer": "Software Developers", "fullstack": "Software Developers",
    "mobile developer": "Software Developers", "ios developer": "Software Developers",
    "android developer": "Software Developers", "qa engineer": "Software Quality Assurance Analysts and Testers",
    "qa tester": "Software Quality Assurance Analysts and Testers", "sysadmin": "Network and Computer Systems Administrators",
    "system admin": "Network and Computer Systems Administrators", "it support": "Computer User Support Specialists",
    "help desk": "Computer User Support Specialists", "it manager": "Computer and Information Systems Managers",
    "cto": "Computer and Information Systems Managers", "cio": "Computer and Information Systems Managers",
    "data analyst": "Data Analyst", "data scientist": "Data Scientists", "data engineer": "Data Engineer",
    "ml engineer": "Machine Learning Engineer", "ai engineer": "Machine Learning Engineer",
    "ai researcher": "AI Research Scientist", "devops": "DevOps Engineer", "devops engineer": "DevOps Engineer",
    "cloud engineer": "Cloud Engineer", "sre": "DevOps Engineer", "dba": "Database Administrators and Architects",
    "database admin": "Database Administrators and Architects", "cybersecurity": "Computer and Information Security Analysts",
    "security analyst": "Computer and Information Security Analysts", "network engineer": "Computer Network Architects",
    "ux designer": "UX Designer", "ui designer": "UX Designer", "ux researcher": "UX Researcher",
    "product manager": "Product Manager", "program manager": "Program Manager",
    "scrum master": "Project Management Specialists", "technical writer": "Technical Writers",
    "statistician": "Statisticians",
    // Business / Management
    "ceo": "Chief Executives", "cfo": "Financial Managers", "coo": "General and Operations Managers",
    "executive": "Chief Executives", "operations manager": "General and Operations Managers",
    "business owner": "Business Owner", "entrepreneur": "Entrepreneur", "franchise owner": "Franchise Owner",
    "small business owner": "Business Owner", "startup founder": "Entrepreneur",
    "manager": "General and Operations Managers", "project manager": "Project Management Specialists",
    "business analyst": "Business Analyst", "management consultant": "Management Consultant",
    "consultant": "Management Analysts", "strategy consultant": "Management Analysts",
    "hr manager": "Human Resources Managers", "hr specialist": "Human Resources Specialists",
    "human resources": "Human Resources Specialists", "recruiter": "Human Resources Specialists",
    "training manager": "Training and Development Managers", "trainer specialist": "Training and Development Specialists",
    "office manager": "Office Supervisors", "admin assistant": "Secretaries and Administrative Assistants",
    "executive assistant": "Executive Secretaries and Executive Administrative Assistants",
    "secretary": "Secretaries and Administrative Assistants", "receptionist": "Receptionists and Information Clerks",
    "bookkeeper": "Bookkeeping and Accounting Clerks", "customer service": "Customer Service Representatives",
    "customer service rep": "Customer Service Representatives",
    // Finance / Accounting
    "accountant": "Accountants and Auditors", "auditor": "Accountants and Auditors",
    "cpa": "Accountants and Auditors", "financial analyst": "Financial Analysts",
    "financial advisor": "Personal Financial Advisors", "financial planner": "Personal Financial Advisors",
    "investment banker": "Financial Analysts", "banker": "Loan Officers",
    "loan officer": "Loan Officers", "underwriter": "Insurance Underwriters",
    "tax preparer": "Tax Preparers", "tax accountant": "Accountants and Auditors",
    "budget analyst": "Budget Analysts", "credit analyst": "Credit Analysts",
    "risk analyst": "Financial Risk Specialists", "compliance officer": "Compliance Officers",
    "financial manager": "Financial Managers", "controller": "Financial Managers",
    // Marketing / Sales
    "marketing manager": "Marketing Managers", "marketing coordinator": "Market Research Analysts",
    "marketing specialist": "Market Research Analysts", "digital marketer": "Market Research Analysts",
    "social media manager": "Social Media Manager", "content strategist": "Content Strategist",
    "copywriter": "Copywriter", "brand manager": "Brand Manager",
    "seo specialist": "Market Research Analysts", "pr specialist": "Public Relations Specialists",
    "pr manager": "Public Relations Managers", "public relations": "Public Relations Specialists",
    "advertising manager": "Advertising and Promotions Managers",
    "sales manager": "Sales Managers", "salesperson": "Retail Salespersons",
    "sales rep": "Sales Representatives, Wholesale and Manufacturing",
    "sales representative": "Sales Representatives, Wholesale and Manufacturing",
    "account executive": "Account Executive", "bdr": "Business Development Representative",
    "sdr": "Business Development Representative", "business development": "Business Development Representative",
    "sales engineer": "Sales Engineer", "insurance agent": "Insurance Sales Agents",
    "real estate agent": "Real Estate Sales Agents", "realtor": "Real Estate Sales Agents",
    "real estate broker": "Real Estate Brokers", "cashier": "Cashiers",
    "retail": "Retail Salespersons", "retail manager": "Sales Supervisors, Retail",
    // Healthcare
    "nurse": "Registered Nurses", "rn": "Registered Nurses", "registered nurse": "Registered Nurses",
    "lpn": "Licensed Practical and Licensed Vocational Nurses", "lvn": "Licensed Practical and Licensed Vocational Nurses",
    "nurse practitioner": "Nurse Practitioners", "np": "Nurse Practitioners",
    "nurse anesthetist": "Nurse Anesthetists", "crna": "Nurse Anesthetists",
    "physician assistant": "Physician Assistants", "pa": "Physician Assistants",
    "doctor": "Physicians, All Other", "physician": "Physicians, All Other", "md": "Physicians, All Other",
    "surgeon": "Physicians, All Other", "dentist": "Dentists, General",
    "pharmacist": "Pharmacists", "pharmacy tech": "Pharmacy Technicians",
    "physical therapist": "Physical Therapists", "pt": "Physical Therapists",
    "occupational therapist": "Occupational Therapists", "ot": "Occupational Therapists",
    "speech therapist": "Speech-Language Pathologists", "slp": "Speech-Language Pathologists",
    "therapist": "Clinical and Counseling Psychologists", "psychologist": "Clinical and Counseling Psychologists",
    "counselor": "Mental Health Counselors", "social worker": "Child and Family Social Workers",
    "dietitian": "Dietitians and Nutritionists", "nutritionist": "Dietitians and Nutritionists",
    "emt": "Emergency Medical Technicians and Paramedics", "paramedic": "Emergency Medical Technicians and Paramedics",
    "medical assistant": "Medical Assistants", "cna": "Nursing Assistants",
    "nursing assistant": "Nursing Assistants", "dental assistant": "Dental Assistants",
    "phlebotomist": "Phlebotomists", "radiologist": "Radiologic Technologists and Technicians",
    "sonographer": "Diagnostic Medical Sonographers", "lab tech": "Clinical Laboratory Technologists and Technicians",
    "optometrist": "Ophthalmologists and Optometrists", "audiologist": "Audiologists",
    "chiropractor": "Chiropractors", "home health aide": "Home Health and Personal Care Aides",
    "caregiver": "Home Health and Personal Care Aides",
    // Legal
    "lawyer": "Lawyers", "attorney": "Lawyers", "paralegal": "Paralegals and Legal Assistants",
    "legal assistant": "Paralegals and Legal Assistants", "corporate lawyer": "Corporate Counsel",
    "judge": "Judicial Law Clerks", "law clerk": "Judicial Law Clerks",
    // Engineering
    "engineer": "Engineers, All Other", "civil engineer": "Civil Engineers",
    "mechanical engineer": "Mechanical Engineers", "electrical engineer": "Electrical Engineers",
    "chemical engineer": "Chemical Engineers", "aerospace engineer": "Aerospace Engineers",
    "environmental engineer": "Environmental Engineers", "industrial engineer": "Industrial Engineers",
    "architect": "Architects", "drafter": "Architectural and Civil Drafters",
    // Trades / Construction
    "electrician": "Electricians", "plumber": "Plumbers and Pipefitters",
    "carpenter": "Carpenters", "welder": "Welders, Cutters, Solderers, and Brazers",
    "hvac": "Heating and Air Conditioning Mechanics (HVAC)", "hvac technician": "Heating and Air Conditioning Mechanics (HVAC)",
    "construction worker": "Construction Laborers", "construction manager": "Construction Managers",
    "general contractor": "Construction Managers", "foreman": "Construction Supervisors",
    "heavy equipment operator": "Operating Engineers and Heavy Equipment Operators",
    "ironworker": "Structural Iron and Steel Workers", "sheet metal worker": "Sheet Metal Workers",
    "machinist": "Machinists", "mechanic": "Automotive Service Technicians",
    "auto mechanic": "Automotive Service Technicians", "maintenance worker": "Maintenance and Repair Workers, General",
    "janitor": "Janitors and Cleaners", "custodian": "Janitors and Cleaners",
    "landscaper": "Landscaping and Groundskeeping Workers", "lineman": "Electrical Power-Line Installers and Repairers",
    "power lineman": "Electrical Power-Line Installers and Repairers",
    // Transportation
    "truck driver": "Heavy and Tractor-Trailer Truck Drivers", "trucker": "Heavy and Tractor-Trailer Truck Drivers",
    "delivery driver": "Light Truck Drivers and Delivery Drivers", "bus driver": "Bus Drivers, Transit and Intercity",
    "pilot": "Airline Pilots, Copilots, and Flight Engineers", "airline pilot": "Airline Pilots, Copilots, and Flight Engineers",
    "conductor": "Railroad Conductors and Yardmasters",
    // Food / Hospitality
    "chef": "Chefs and Head Cooks", "cook": "Cooks, Restaurant", "line cook": "Cooks, Restaurant",
    "sous chef": "Chefs and Head Cooks", "head chef": "Chefs and Head Cooks",
    "restaurant manager": "Food Service Managers", "bartender": "Bartenders",
    "waiter": "Waiters and Waitresses", "waitress": "Waiters and Waitresses",
    "server": "Waiters and Waitresses", "barista": "Fast Food and Counter Workers",
    "fast food": "Fast Food and Counter Workers", "food prep": "Food Preparation Workers",
    // Creative / Design
    "graphic designer": "Graphic Designers", "interior designer": "Interior Designers",
    "animator": "Special Effects Artists and Animators", "photographer": "Photographers",
    "videographer": "Film and Video Editors", "video editor": "Film and Video Editors",
    "editor": "Editors", "writer": "Writers and Authors", "author": "Writers and Authors",
    "journalist": "News Analysts, Reporters, and Journalists", "reporter": "News Analysts, Reporters, and Journalists",
    "translator": "Interpreters and Translators", "interpreter": "Interpreters and Translators",
    "art director": "Art Directors", "creative director": "Art Directors",
    "industrial designer": "Commercial and Industrial Designers",
    "producer": "Producers and Directors", "director": "Producers and Directors",
    "actor": "Actors", "actress": "Actors", "musician": "Musicians and Singers",
    "singer": "Musicians and Singers", "composer": "Music Directors and Composers",
    "dj": "Broadcast Announcers and Radio DJs",
    // Protective Services
    "police officer": "Police and Sheriff's Patrol Officers", "cop": "Police and Sheriff's Patrol Officers",
    "police": "Police and Sheriff's Patrol Officers", "detective": "Police and Detective Supervisors",
    "firefighter": "Firefighters", "fireman": "Firefighters",
    "security guard": "Security Guards", "corrections officer": "Correctional Officers",
    "prison guard": "Correctional Officers",
    // Science
    "scientist": "Medical Scientists", "chemist": "Chemists", "physicist": "Physicists",
    "biologist": "Medical Scientists", "economist": "Economists",
    "environmental scientist": "Environmental Scientists and Geoscientists",
    "geologist": "Environmental Scientists and Geoscientists",
    "urban planner": "Urban and Regional Planners",
    // Personal Care
    "hairstylist": "Hairdressers, Hairstylists, and Cosmetologists",
    "barber": "Hairdressers, Hairstylists, and Cosmetologists",
    "cosmetologist": "Hairdressers, Hairstylists, and Cosmetologists",
    "nail tech": "Manicurists and Pedicurists", "manicurist": "Manicurists and Pedicurists",
    "esthetician": "Skincare Specialists", "childcare": "Childcare Workers",
    "nanny": "Childcare Workers", "babysitter": "Childcare Workers",
    "dog walker": "Animal Caretakers", "pet sitter": "Animal Caretakers",
    "veterinary assistant": "Animal Caretakers",
    // Farming
    "farmer": "Farm and Ranch Managers", "rancher": "Farm and Ranch Managers",
    "farmworker": "Farmworkers and Laborers",
    // Manufacturing
    "factory worker": "Assemblers and Fabricators, All Other",
    "assembly": "Assemblers and Fabricators, All Other",
    "production supervisor": "Production Supervisors",
    "warehouse worker": "Laborers and Material Movers, Hand",
    "forklift operator": "Laborers and Material Movers, Hand",
  };

  // ── Smart job title matching ──
  function matchJobTitle(input) {
    const q = input.toLowerCase().trim();
    if (!q) return null;

    // 1. Check exact alias match
    if (ALIASES[q]) {
      const aliasTarget = ALIASES[q].toLowerCase();
      const found = BLS_DATA.find(r => r.title.toLowerCase() === aliasTarget);
      if (found) return found;
    }

    // 2. Check partial alias matches (e.g., "teaching coaching" → check each word and pairs)
    const qWords = q.split(/\s+/);
    // Try multi-word combos first (longest to shortest)
    for (let len = qWords.length; len >= 1; len--) {
      for (let i = 0; i <= qWords.length - len; i++) {
        const phrase = qWords.slice(i, i + len).join(" ");
        if (ALIASES[phrase]) {
          const aliasTarget = ALIASES[phrase].toLowerCase();
          const found = BLS_DATA.find(r => r.title.toLowerCase() === aliasTarget);
          if (found) return found;
        }
      }
    }

    // 3. Score-based matching against BLS titles
    let best = null, bestScore = 0;
    for (const row of BLS_DATA) {
      const t = row.title.toLowerCase();
      let score = 0;

      // Exact match
      if (t === q) return row;

      // Full query contained in title
      if (t.includes(q)) score += 80;

      // Title contained in query
      if (q.includes(t)) score += 70;

      // Word-level matching
      for (const w of qWords) {
        if (w.length <= 2) continue; // skip tiny words like "a", "of", "an"
        if (t.includes(w)) {
          score += 10 + w.length;
        }
        // Check word stems (e.g., "teaching" → "teach", "nursing" → "nurs")
        const stem = w.length > 4 ? w.slice(0, -3) : w;
        if (stem.length > 2 && t.includes(stem)) {
          score += 5 + stem.length;
        }
      }

      // Check BLS title words against query
      const titleWords = t.split(/[\s,/]+/);
      let titleMatchCount = 0;
      for (const tw of titleWords) {
        if (tw.length <= 2) continue;
        if (q.includes(tw)) {
          score += 6;
          titleMatchCount++;
        }
        const twStem = tw.length > 4 ? tw.slice(0, -3) : tw;
        if (twStem.length > 2 && q.includes(twStem)) {
          score += 3;
          titleMatchCount++;
        }
      }

      // Bonus for matching a high percentage of title words
      const meaningfulTitleWords = titleWords.filter(w => w.length > 2).length;
      if (meaningfulTitleWords > 0 && titleMatchCount / meaningfulTitleWords > 0.5) {
        score += 15;
      }

      if (score > bestScore) { bestScore = score; best = row; }
    }

    return bestScore > 8 ? best : null;
  }

  // ── Get nearby occupations for comparison ──
  function getNearbyOccupations(matched) {
    if (!matched) return [];
    return BLS_DATA
      .filter(r => r.group === matched.group && r.occ_code !== matched.occ_code)
      .sort((a, b) => Math.abs(a.a_median - matched.a_median) - Math.abs(b.a_median - matched.a_median))
      .slice(0, 5);
  }

  // ── Calculate salary position ──
  function calculatePosition(salary, data) {
    if (salary <= data.a_pct10) return 5;
    if (salary <= data.a_pct25) return 10 + 15 * (salary - data.a_pct10) / (data.a_pct25 - data.a_pct10);
    if (salary <= data.a_median) return 25 + 25 * (salary - data.a_pct25) / (data.a_median - data.a_pct25);
    if (salary <= data.a_pct75) return 50 + 25 * (salary - data.a_median) / (data.a_pct75 - data.a_median);
    if (salary <= data.a_pct90) return 75 + 15 * (salary - data.a_pct75) / (data.a_pct90 - data.a_pct75);
    return 95;
  }

  // ── Process user inputs ──
  function analyze() {
    const matched = matchJobTitle(formData.jobTitle);
    const salary = parseFloat(formData.currentSalary);
    const locMult = LOCATION_MULTIPLIERS[formData.location] || 1.0;

    if (!matched) {
      setResults({
        error: true,
        message: `Could not find a close match for "${formData.jobTitle}" in BLS data. Try a standard job title like: "Registered Nurses", "Accountants", "Marketing Managers", "Electricians", "Software Developers", "Lawyers", "Graphic Designers", "Truck Drivers", "Real Estate Agents", or "Chefs".`,
      });
      setStep(2);
      return;
    }

    const adjMedian = Math.round(matched.a_median * locMult);
    const adjPct25 = Math.round(matched.a_pct25 * locMult);
    const adjPct75 = Math.round(matched.a_pct75 * locMult);
    const adjPct90 = Math.round(matched.a_pct90 * locMult);
    const adjPct10 = Math.round(matched.a_pct10 * locMult);
    const percentile = calculatePosition(salary, {
      a_pct10: adjPct10, a_pct25: adjPct25, a_median: adjMedian,
      a_pct75: adjPct75, a_pct90: adjPct90,
    });
    const gap = salary - adjMedian;
    const nearby = getNearbyOccupations(matched);

    setResults({
      error: false,
      matched,
      salary,
      location: formData.location,
      locMult,
      adjPct10, adjPct25, adjMedian, adjPct75, adjPct90,
      percentile: Math.round(percentile),
      gap,
      nearby,
      yearsExperience: formData.yearsExperience,
    });
    setStep(1);

    // Start LLM analysis (local fallback handles API failures)
    if (formData.resumeText.trim().length > 20) {
      callLLM(matched, salary, adjPct25, adjMedian, adjPct75, adjPct90, percentile, nearby, formData);
    } else {
      // No resume: run local analysis with salary data only
      const localResult = analyzeResumeLocally(matched, salary, adjMedian, adjPct75, adjPct90, percentile, nearby, formData);
      setLlmAnalysis(localResult);
      setAnalysisMethod("rule-based");
    }

    // Animation stages
    setTimeout(() => setAnimStage(1), 600);
    setTimeout(() => setAnimStage(2), 1400);
    setTimeout(() => { setStep(2); setAnimStage(3); }, 2200);
  }

  // ── Skill / keyword dictionaries for rule-based analysis ──
  const SKILL_CATALOG = {
    languages: { keywords: ["python","java","javascript","typescript","c++","c#","go","rust","ruby","scala","kotlin","swift","r","matlab","php","perl","shell","bash","sql","html","css"], label: "Programming Languages" },
    mlai: { keywords: ["machine learning","deep learning","neural network","nlp","natural language","computer vision","reinforcement learning","generative ai","llm","large language model","transformer","bert","gpt","diffusion","rag","fine-tun","pytorch","tensorflow","keras","scikit-learn","xgboost","lightgbm","hugging face","langchain","opencv"], label: "ML / AI" },
    data: { keywords: ["data analysis","data science","data engineer","etl","pipeline","warehouse","lake","spark","hadoop","airflow","dbt","kafka","snowflake","redshift","bigquery","databricks","pandas","numpy","scipy","matplotlib","seaborn","plotly","tableau","power bi","looker","excel","google sheets","spreadsheet","pivot table","vlookup"], label: "Data & Analytics" },
    cloud: { keywords: ["aws","amazon web services","azure","gcp","google cloud","cloud","ec2","s3","lambda","sagemaker","ecs","fargate","cloudformation","terraform","pulumi","serverless"], label: "Cloud & Infrastructure" },
    devops: { keywords: ["docker","kubernetes","k8s","ci/cd","jenkins","github actions","gitlab","ansible","puppet","chef","monitoring","grafana","prometheus","datadog","observability","sre","devops"], label: "DevOps / SRE" },
    web: { keywords: ["react","angular","vue","next.js","node","express","django","flask","fastapi","spring","graphql","rest api","microservice","frontend","backend","full-stack","fullstack"], label: "Web / Software Engineering" },
    db: { keywords: ["sql","postgresql","mysql","mongodb","redis","elasticsearch","cassandra","dynamodb","neo4j","database","nosql","orm","query optimization"], label: "Databases" },
    security: { keywords: ["security","cybersecurity","penetration","vulnerability","encryption","authentication","authorization","oauth","sso","compliance","soc 2","iso 27001","gdpr"], label: "Security" },
    leadership: { keywords: ["lead","leader","leadership","manager","management","director","vp","head of","chief","mentor","coach","team lead","cross-functional","stakeholder","executive","strategy","roadmap","supervised","oversaw","managed a team"], label: "Leadership & Strategy" },
    softskills: { keywords: ["communication","presentation","public speaking","writing","collaboration","problem-solving","critical thinking","agile","scrum","kanban","jira","project management","product management","negotiation","conflict resolution"], label: "Soft Skills & PM" },
    acad: { keywords: ["phd","ph.d","master","m.s.","m.a.","mba","bachelor","b.s.","b.a.","degree","university","college","graduate","research","publication","thesis","dissertation","gpa"], label: "Education & Research" },
    certs: { keywords: ["certified","certification","aws certified","google certified","azure certified","pmp","cfa","cpa","cissp","comptia","professional engineer","licensed","license","board certified"], label: "Certifications" },
    finance: { keywords: ["accounting","audit","tax","financial reporting","gaap","ifrs","budgeting","forecasting","revenue","profit","loss","balance sheet","income statement","cash flow","quickbooks","sap","erp","accounts payable","accounts receivable","bookkeeping","investment","portfolio","risk management","underwriting","valuation","due diligence"], label: "Finance & Accounting" },
    marketing: { keywords: ["marketing","seo","sem","ppc","google ads","facebook ads","social media","content marketing","email marketing","crm","hubspot","salesforce","mailchimp","branding","brand strategy","campaign","conversion","analytics","a/b testing","market research","digital marketing","influencer","copywriting","advertising","public relations","pr"], label: "Marketing & Communications" },
    sales: { keywords: ["sales","cold calling","prospecting","lead generation","pipeline","quota","territory","account management","crm","salesforce","hubspot","negotiation","closing","b2b","b2c","revenue","client relationship","customer acquisition","business development","upsell","cross-sell"], label: "Sales & Business Development" },
    healthcare: { keywords: ["patient care","clinical","diagnosis","treatment","emr","ehr","epic","cerner","hipaa","medical records","vitals","triage","bedside","nursing","pharmacy","rehabilitation","therapy","surgical","anesthesia","radiology","laboratory","specimen","cpr","bls","acls","charting","rounds"], label: "Healthcare & Clinical" },
    education: { keywords: ["curriculum","lesson plan","classroom","instruction","pedagogy","assessment","grading","student","teaching","tutoring","mentoring","iep","special education","differentiation","common core","learning outcomes","educational technology","lms","canvas","blackboard"], label: "Education & Teaching" },
    trades: { keywords: ["welding","plumbing","electrical","carpentry","hvac","blueprint","schematic","osha","safety","inspection","installation","maintenance","repair","troubleshoot","diagnostic","wiring","pipe","equipment","machinery","construction","building code","permit"], label: "Trades & Technical" },
    legal: { keywords: ["legal research","litigation","contract","brief","discovery","deposition","compliance","regulatory","statute","case law","westlaw","lexisnexis","paralegal","court filing","mediation","arbitration","intellectual property","patent","trademark","corporate law"], label: "Legal" },
    creative: { keywords: ["design","photoshop","illustrator","figma","sketch","indesign","after effects","premiere","final cut","photography","videography","animation","motion graphics","typography","illustration","art direction","creative direction","storyboard","color theory","layout","ux","ui","wireframe","prototype","user research"], label: "Creative & Design" },
    hospitality: { keywords: ["hospitality","front desk","guest services","concierge","reservation","banquet","catering","food service","restaurant","hotel","housekeeping","event planning","food safety","servsafe","mixology","sommelier","menu","dining"], label: "Hospitality & Food Service" },
    realestate: { keywords: ["real estate","property","listing","mls","appraisal","inspection","mortgage","escrow","title","closing","commercial real estate","residential","zoning","land use","tenant","lease","property management"], label: "Real Estate" },
  };

  const CERT_RECOMMENDATIONS = {
    "Computer and Mathematical": [
      { cert: "AWS Solutions Architect", context: "cloud" },
      { cert: "Google Professional Data Engineer", context: "data" },
      { cert: "Google Professional Machine Learning Engineer", context: "mlai" },
      { cert: "Certified Kubernetes Administrator (CKA)", context: "devops" },
      { cert: "CompTIA Security+", context: "security" },
      { cert: "PMP or Certified Scrum Master", context: "leadership" },
      { cert: "dbt Analytics Engineering", context: "data" },
    ],
    "Management": [
      { cert: "PMP (Project Management Professional)", context: "default" },
      { cert: "Certified Scrum Master (CSM)", context: "softskills" },
      { cert: "Six Sigma Green/Black Belt", context: "default" },
      { cert: "MBA or Executive Leadership Program", context: "acad" },
      { cert: "Google Data Analytics Certificate", context: "data" },
    ],
    "Business and Financial": [
      { cert: "CFA (Chartered Financial Analyst)", context: "default" },
      { cert: "CPA (Certified Public Accountant)", context: "default" },
      { cert: "Google Data Analytics Certificate", context: "data" },
      { cert: "Tableau Desktop Specialist", context: "data" },
      { cert: "PMP", context: "leadership" },
      { cert: "FRM (Financial Risk Manager)", context: "default" },
    ],
    "Architecture and Engineering": [
      { cert: "Professional Engineer (PE) License", context: "default" },
      { cert: "LEED Accredited Professional", context: "default" },
      { cert: "PMP (Project Management Professional)", context: "leadership" },
      { cert: "Six Sigma Green Belt", context: "default" },
      { cert: "AutoCAD/Revit Certification", context: "default" },
    ],
    "Healthcare Practitioners": [
      { cert: "BLS/ACLS Certification", context: "default" },
      { cert: "Specialty Board Certification", context: "default" },
      { cert: "Certified Nurse Practitioner (if applicable)", context: "default" },
      { cert: "Lean Six Sigma for Healthcare", context: "default" },
      { cert: "Epic EHR Certification", context: "default" },
    ],
    "Healthcare Support": [
      { cert: "Certified Nursing Assistant (CNA)", context: "default" },
      { cert: "CPR/First Aid Certification", context: "default" },
      { cert: "Medical Assistant Certification (CMA)", context: "default" },
      { cert: "Phlebotomy Technician Certification", context: "default" },
    ],
    "Education": [
      { cert: "Teaching License/Credential", context: "default" },
      { cert: "National Board Certification", context: "default" },
      { cert: "ESL/TESOL Certification", context: "default" },
      { cert: "Google Certified Educator", context: "default" },
      { cert: "Special Education Endorsement", context: "default" },
    ],
    "Legal": [
      { cert: "Bar Admission (additional states)", context: "default" },
      { cert: "Certified Paralegal (CP)", context: "default" },
      { cert: "Certified Compliance & Ethics Professional", context: "default" },
      { cert: "Mediation/Arbitration Certification", context: "default" },
    ],
    "Sales": [
      { cert: "Certified Professional Sales Person (CPSP)", context: "default" },
      { cert: "HubSpot Sales Software Certification", context: "default" },
      { cert: "Salesforce Administrator Certification", context: "default" },
      { cert: "Certified Inside Sales Professional (CISP)", context: "default" },
    ],
    "Arts, Design, Entertainment": [
      { cert: "Adobe Certified Professional", context: "default" },
      { cert: "Google UX Design Certificate", context: "creative" },
      { cert: "HubSpot Content Marketing Certification", context: "marketing" },
      { cert: "Google Analytics Certification", context: "data" },
      { cert: "Certified Digital Marketing Professional", context: "marketing" },
    ],
    "Construction and Extraction": [
      { cert: "OSHA 30-Hour Safety Certification", context: "default" },
      { cert: "Journeyman/Master License (trade-specific)", context: "default" },
      { cert: "PMP or Construction Management Certification", context: "leadership" },
      { cert: "LEED Green Associate", context: "default" },
    ],
    "Installation and Maintenance": [
      { cert: "EPA 608 Certification (HVAC)", context: "default" },
      { cert: "ASE Certification (Automotive)", context: "default" },
      { cert: "Journeyman Electrician License", context: "default" },
      { cert: "OSHA Safety Certification", context: "default" },
    ],
    "Protective Service": [
      { cert: "POST Certification (Law Enforcement)", context: "default" },
      { cert: "EMT/Paramedic Certification", context: "default" },
      { cert: "Fire Officer Certification", context: "default" },
      { cert: "Certified Protection Professional (CPP)", context: "default" },
    ],
    "Food Preparation and Serving": [
      { cert: "ServSafe Food Protection Manager", context: "default" },
      { cert: "Certified Executive Chef (CEC)", context: "default" },
      { cert: "Sommelier Certification", context: "default" },
      { cert: "Food Safety Manager Certification", context: "default" },
    ],
    "Life, Physical, and Social Science": [
      { cert: "Certified Laboratory Professional", context: "default" },
      { cert: "Professional Environmental Scientist", context: "default" },
      { cert: "Licensed Psychologist (if applicable)", context: "default" },
      { cert: "GIS Professional (GISP)", context: "default" },
    ],
    "Community and Social Service": [
      { cert: "Licensed Clinical Social Worker (LCSW)", context: "default" },
      { cert: "Licensed Professional Counselor (LPC)", context: "default" },
      { cert: "Certified Nonprofit Professional", context: "default" },
      { cert: "CASAC (substance abuse)", context: "default" },
    ],
    default: [
      { cert: "Google Data Analytics Certificate", context: "data" },
      { cert: "PMP (Project Management Professional)", context: "leadership" },
      { cert: "Industry-specific certification", context: "default" },
      { cert: "First Aid / CPR Certification", context: "default" },
    ],
  };

  const SKILL_GAP_MAP = {
    "Computer and Mathematical": {
      high: ["cloud architecture (AWS/GCP/Azure)","ML/AI fundamentals","system design"],
      medium: ["containerization (Docker/K8s)","CI/CD pipelines","data engineering (Spark/Airflow)"],
      general: ["API design","monitoring & observability","technical writing"],
    },
    "Management": {
      high: ["data-driven decision making","financial modeling","strategic planning"],
      medium: ["SQL & analytics tools","product management frameworks","OKR methodology"],
      general: ["executive communication","stakeholder management","change management"],
    },
    "Business and Financial": {
      high: ["advanced Excel / financial modeling","SQL & BI tools","Python for data analysis"],
      medium: ["Tableau / Power BI","statistical analysis","automation scripting"],
      general: ["presentation design","project management","client communication"],
    },
    "Architecture and Engineering": {
      high: ["CAD/BIM software proficiency","project management","regulatory compliance"],
      medium: ["sustainability design (LEED)","data analysis for engineering","simulation tools"],
      general: ["technical report writing","cross-disciplinary collaboration","client presentation"],
    },
    "Healthcare Practitioners": {
      high: ["EHR/EMR systems proficiency","evidence-based practice","specialty certifications"],
      medium: ["patient communication","healthcare informatics","quality improvement (Lean/Six Sigma)"],
      general: ["leadership & mentoring","research methodology","telehealth competency"],
    },
    "Healthcare Support": {
      high: ["clinical skills advancement","EHR documentation","patient safety protocols"],
      medium: ["communication & empathy","infection control","medical terminology"],
      general: ["CPR/First Aid recertification","time management","team coordination"],
    },
    "Education": {
      high: ["educational technology integration","differentiated instruction","data-driven assessment"],
      medium: ["curriculum design","classroom management strategies","student engagement techniques"],
      general: ["parent/community communication","professional development","special needs awareness"],
    },
    "Legal": {
      high: ["legal research & writing","e-discovery tools","contract negotiation"],
      medium: ["legal technology (Westlaw, LexisNexis)","regulatory compliance","client management"],
      general: ["public speaking & oral argument","business development","cross-jurisdictional knowledge"],
    },
    "Sales": {
      high: ["CRM mastery (Salesforce/HubSpot)","consultative selling methodology","pipeline management"],
      medium: ["data-driven sales analytics","social selling (LinkedIn)","negotiation techniques"],
      general: ["presentation skills","territory planning","customer success mindset"],
    },
    "Arts, Design, Entertainment": {
      high: ["digital marketing analytics","content strategy","design systems & Figma"],
      medium: ["SEO/SEM fundamentals","video production","user research methods"],
      general: ["portfolio development","personal branding","client communication"],
    },
    "Construction and Extraction": {
      high: ["blueprint reading & estimation","OSHA safety compliance","project scheduling"],
      medium: ["equipment operation certifications","green building practices","BIM software"],
      general: ["team supervision","quality control","contract management"],
    },
    "Installation and Maintenance": {
      high: ["advanced diagnostic & troubleshooting","safety certifications (OSHA)","specialized trade licenses"],
      medium: ["electrical/mechanical systems knowledge","preventive maintenance planning","documentation"],
      general: ["customer service","time management","inventory management"],
    },
    "Protective Service": {
      high: ["emergency response protocols","de-escalation techniques","physical fitness standards"],
      medium: ["report writing","community engagement","technology (body cameras, databases)"],
      general: ["leadership & supervision","mental health awareness","continuing education"],
    },
    "Food Preparation and Serving": {
      high: ["food safety certification (ServSafe)","menu costing & development","kitchen management"],
      medium: ["inventory & supply chain","staff training & scheduling","POS systems"],
      general: ["customer service excellence","allergen awareness","wine/beverage knowledge"],
    },
    "Office and Administrative Support": {
      high: ["advanced Microsoft Office (Excel, PowerPoint)","office management systems","scheduling & coordination"],
      medium: ["bookkeeping basics","CRM/database management","business writing"],
      general: ["professional communication","time management","process improvement"],
    },
    "Transportation": {
      high: ["CDL or specialized license","DOT compliance & safety regulations","route optimization"],
      medium: ["fleet management software","logistics coordination","hazmat certification"],
      general: ["customer service","time management","vehicle maintenance knowledge"],
    },
    "Life, Physical, and Social Science": {
      high: ["advanced research methodology","statistical software (R, SPSS, SAS)","grant writing"],
      medium: ["laboratory techniques","peer-reviewed publication","GIS/spatial analysis"],
      general: ["science communication","interdisciplinary collaboration","regulatory knowledge"],
    },
    "Community and Social Service": {
      high: ["clinical assessment & diagnosis","evidence-based interventions","case management"],
      medium: ["crisis intervention","cultural competency","grant writing & program evaluation"],
      general: ["self-care & burnout prevention","advocacy skills","community outreach"],
    },
    "Personal Care and Service": {
      high: ["advanced technique training (specialty-specific)","client consultation skills","sanitation & safety"],
      medium: ["business management basics","social media marketing","product knowledge"],
      general: ["customer retention strategies","time management","continuing education"],
    },
    "Production": {
      high: ["lean manufacturing / Six Sigma","quality control systems","equipment operation"],
      medium: ["safety protocols (OSHA)","blueprint/schematic reading","inventory management"],
      general: ["team coordination","problem-solving","continuous improvement"],
    },
    "Building and Grounds": {
      high: ["facility maintenance systems","safety compliance","equipment operation"],
      medium: ["landscaping design","chemical safety","scheduling & planning"],
      general: ["customer communication","time management","basic repairs"],
    },
    "Farming, Fishing, Forestry": {
      high: ["agricultural technology & precision farming","crop/livestock management","equipment operation"],
      medium: ["business management","sustainability practices","regulatory compliance"],
      general: ["weather & market analysis","record keeping","team management"],
    },
    default: {
      high: ["data literacy & analytics","project management","technical proficiency"],
      medium: ["communication & storytelling","automation tools","industry certifications"],
      general: ["leadership skills","cross-functional collaboration","domain expertise"],
    },
  };

  // ── Rule-based resume analysis engine ──
  function analyzeResumeLocally(matched, salary, adjMedian, adjPct75, adjPct90, percentile, nearby, form) {
    const text = form.resumeText.toLowerCase();
    const titleLower = form.jobTitle.toLowerCase();

    // 1. Detect skills present in resume
    const foundCategories = {};
    const allFoundSkills = [];
    for (const [cat, info] of Object.entries(SKILL_CATALOG)) {
      const hits = info.keywords.filter(kw => text.includes(kw));
      if (hits.length > 0) {
        foundCategories[cat] = hits;
        allFoundSkills.push(...hits);
      }
    }
    const categoryNames = Object.keys(foundCategories);

    // 2. Build strengths from detected categories
    const resumeStrengths = [];
    if (foundCategories.mlai?.length >= 2) resumeStrengths.push(`Strong ML/AI foundation with skills in ${foundCategories.mlai.slice(0,3).join(", ")}`);
    if (foundCategories.languages?.length >= 3) resumeStrengths.push(`Proficiency across ${foundCategories.languages.length} programming languages (${foundCategories.languages.slice(0,4).join(", ")})`);
    if (foundCategories.data?.length >= 2) resumeStrengths.push(`Solid data & analytics toolkit including ${foundCategories.data.slice(0,3).join(", ")}`);
    if (foundCategories.cloud?.length >= 1) resumeStrengths.push(`Cloud platform experience (${foundCategories.cloud.slice(0,2).join(", ")})`);
    if (foundCategories.leadership?.length >= 1) resumeStrengths.push(`Leadership and management experience demonstrated in resume`);
    if (foundCategories.web?.length >= 2) resumeStrengths.push(`Full-stack development skills with ${foundCategories.web.slice(0,3).join(", ")}`);
    if (foundCategories.devops?.length >= 1) resumeStrengths.push(`DevOps/infrastructure skills (${foundCategories.devops.slice(0,2).join(", ")})`);
    if (foundCategories.softskills?.length >= 1) resumeStrengths.push(`Project management and collaboration experience`);
    if (foundCategories.acad?.length >= 1) resumeStrengths.push(`Formal education credentials present on resume`);
    // Ensure at least 3
    if (resumeStrengths.length < 1) resumeStrengths.push("Resume demonstrates professional experience relevant to the target role");
    if (resumeStrengths.length < 2) resumeStrengths.push("Career history shows progression and commitment to the field");
    if (resumeStrengths.length < 3) resumeStrengths.push("Quantifiable or concrete details are present in the resume");
    const finalStrengths = resumeStrengths.slice(0, 4);

    // 3. Identify gaps — categories NOT in resume that matter for the group
    const resumeGaps = [];
    const group = matched.group || "default";
    if (!foundCategories.cloud && (group === "Computer and Mathematical" || group === "Management")) resumeGaps.push("No cloud platform experience (AWS, GCP, or Azure) — increasingly expected for roles above the 75th percentile");
    if (!foundCategories.mlai && group === "Computer and Mathematical") resumeGaps.push("No ML/AI keywords detected — even non-ML roles benefit from data modeling familiarity");
    if (!foundCategories.leadership && percentile < 60) resumeGaps.push("Limited leadership or management language — adding cross-team or mentoring experience would strengthen candidacy for senior roles");
    if (!foundCategories.devops && group === "Computer and Mathematical") resumeGaps.push("Missing DevOps/CI-CD skills — containerization and deployment pipelines are standard for mid-to-senior technical roles");
    if (!foundCategories.data && (group === "Business and Financial" || group === "Management")) resumeGaps.push("No data analytics or BI tools mentioned — SQL, Tableau, or Python for analysis are key differentiators");
    if (!foundCategories.certs) resumeGaps.push("No industry certifications listed — relevant certifications can justify a 10-15% salary premium");
    if (!foundCategories.softskills) resumeGaps.push("Project management and agile methodology keywords are absent — these are valued in both IC and management tracks");
    if (text.length < 500) resumeGaps.push("Resume text appears very brief — ensure all relevant experience, skills, and achievements are included");
    if (resumeGaps.length < 1) resumeGaps.push("Consider adding more quantified achievements (e.g., revenue impact, efficiency gains, team size)");
    if (resumeGaps.length < 2) resumeGaps.push("Ensure resume highlights cross-functional collaboration to demonstrate breadth");
    if (resumeGaps.length < 3) resumeGaps.push("Add metrics and outcomes for key projects to stand out in applicant tracking systems");
    const finalGaps = resumeGaps.slice(0, 4);

    // 4. Skills to add — from gap map, excluding skills already present
    const gapPool = SKILL_GAP_MAP[group] || SKILL_GAP_MAP.default;
    const allGapSkills = [...gapPool.high, ...gapPool.medium, ...gapPool.general];
    const skillsToAdd = allGapSkills.filter(s => {
      const sLower = s.toLowerCase();
      return !allFoundSkills.some(fs => sLower.includes(fs) || fs.includes(sLower.split(" ")[0]));
    }).slice(0, 5);
    if (skillsToAdd.length < 3) skillsToAdd.push("Advanced system design", "Technical documentation", "Cross-functional leadership");

    // 5. Certifications — pick ones relevant to gaps
    const certPool = CERT_RECOMMENDATIONS[group] || CERT_RECOMMENDATIONS.default;
    const certifications = certPool
      .filter(c => !foundCategories[c.context])
      .slice(0, 3)
      .map(c => c.cert);
    if (certifications.length < 2) certifications.push("Google Data Analytics Certificate", "AWS Cloud Practitioner");

    // 6. Career paths — only roles paying MORE than current salary
    const careerPaths = [];
    const locMultLocal = LOCATION_MULTIPLIERS[form.location] || 1;
    const higherRoles = nearby.filter(n => Math.round(n.a_median * locMultLocal) > salary).slice(0, 2);
    for (const role of higherRoles) {
      const adjSal = Math.round(role.a_median * locMultLocal);
      const salIncrease = adjSal - salary;
      careerPaths.push({
        role: role.title,
        estimatedSalary: `$${adjSal.toLocaleString()}`,
        timeframe: salIncrease > 50000 ? "3-5 years" : salIncrease > 25000 ? "2-3 years" : "1-2 years",
        steps: `Build skills in ${skillsToAdd.slice(0,2).join(" and ")}, pursue relevant certifications, and target companies/roles with this title. Consider lateral moves for faster progression.`,
      });
    }
    // If no higher roles found OR salary is already very high
    const seniorTarget = Math.max(Math.round(salary * 1.25), adjPct90);
    if (careerPaths.length === 0) {
      careerPaths.push({
        role: salary > adjPct75 ? `Principal / Staff-level ${form.jobTitle}` : `Senior ${form.jobTitle}`,
        estimatedSalary: `$${seniorTarget.toLocaleString()}`,
        timeframe: "2-4 years",
        steps: salary > adjPct75
          ? `At your level, advancement comes from expanding scope: lead larger initiatives, mentor junior staff, drive org-wide strategy, and negotiate equity/bonus components.`
          : `Deepen current expertise, take on leadership of projects or teams, and build a track record of measurable outcomes to justify senior-level compensation.`,
      });
    }
    // Management path — always higher than current salary
    const mgmtTarget = Math.max(Math.round(salary * 1.4), Math.round(adjPct90 * 1.15));
    careerPaths.push({
      role: group === "Computer and Mathematical" ? "Engineering Manager / Technical Lead" : "Senior Manager / Director",
      estimatedSalary: `$${mgmtTarget.toLocaleString()}`,
      timeframe: "4-6 years",
      steps: "Develop people management skills, lead cross-functional initiatives, build strategic thinking capabilities, and progressively manage larger scope and teams.",
    });

    // 7. Negotiation tips — contextual based on percentile
    const negotiationTips = [];
    if (percentile < 25) {
      negotiationTips.push(`Your salary is below the 25th percentile for ${matched.title} in ${form.location}. You have strong data to support a market adjustment — present BLS benchmarks showing median pay of ${fmt(adjMedian)} in your next review.`);
      negotiationTips.push("Request a meeting specifically focused on compensation review. Frame it as a market alignment discussion rather than a complaint.");
      negotiationTips.push("If your employer can't match market rate, negotiate for accelerated review cycles (every 6 months), equity/bonus components, or professional development budgets.");
    } else if (percentile < 50) {
      negotiationTips.push(`You're between the 25th and 50th percentile. Document your key accomplishments and their business impact — quantify revenue generated, costs saved, or efficiency improvements.`);
      negotiationTips.push(`Target the 75th percentile ($${adjPct75.toLocaleString()}) as your ask. Research shows candidates who anchor higher tend to negotiate better outcomes.`);
      negotiationTips.push("Consider timing your negotiation after a successful project delivery or positive performance review for maximum leverage.");
    } else if (percentile < 75) {
      negotiationTips.push("You're near the market median — a solid position. To reach the 75th percentile, emphasize unique skills and the difficulty of replacing your specific expertise.");
      negotiationTips.push("Negotiate total compensation, not just base salary. Stock options, signing bonuses, remote flexibility, and professional development funds can add 15-30% to total comp.");
      negotiationTips.push("Build leverage through external offers. Even passive interviewing establishes your market value and strengthens your negotiating position.");
    } else {
      negotiationTips.push("You're above the 75th percentile — strong position. Focus negotiations on equity, leadership opportunities, and title progression to continue growing.");
      negotiationTips.push("At this level, your negotiation leverage comes from demonstrated business impact. Maintain a running document of your achievements with dollar figures.");
      negotiationTips.push("Consider negotiating for scope expansion, direct reports, or strategic project ownership which position you for the next salary tier.");
    }

    // 8. Action plan
    const actionPlan = [
      {
        timeframe: "0-3 months",
        actions: `Update resume to address identified gaps. ${certifications[0] ? `Begin studying for ${certifications[0]}.` : "Start a relevant online course."} Build a portfolio project demonstrating ${skillsToAdd[0] || "your key skills"}. Research target companies and roles aligned with career paths above.`,
      },
      {
        timeframe: "3-6 months",
        actions: `Complete certification and add to LinkedIn/resume. ${percentile < 50 ? "Initiate salary negotiation conversation with current employer using BLS data." : "Evaluate external opportunities to benchmark your market value."} Start networking in ${matched.group.toLowerCase()} communities and attend 2-3 industry events or meetups.`,
      },
      {
        timeframe: "6-12 months",
        actions: `Apply to ${careerPaths[0]?.role || "target"} roles if current employer hasn't matched market rate. Build expertise in ${skillsToAdd.slice(0,2).join(" and ")}. ${percentile < 75 ? `Target salary of $${adjPct75.toLocaleString()} (75th percentile) in your next role.` : `Position yourself for leadership roles at the $${adjPct90.toLocaleString()}+ level.`}`,
      },
    ];

    // 9. Overall assessment
    const salaryStatus = percentile < 25 ? "significantly below" : percentile < 45 ? "below" : percentile < 55 ? "near" : percentile < 75 ? "above" : "well above";
    const overallAssessment = `Your current salary of $${salary.toLocaleString()} places you at the ${percentile}th percentile for ${matched.title} in ${form.location}, which is ${salaryStatus} the market median of ${fmt(adjMedian)}. ${resumeStrengths.length >= 3 ? `Your resume shows strong foundations in ${categoryNames.slice(0,2).map(c => SKILL_CATALOG[c]?.label || c).join(" and ")}` : "Your resume provides a foundation to build on"}, and by addressing the identified skill gaps and pursuing targeted certifications, you can realistically target the ${percentile < 50 ? "50th-75th" : "75th-90th"} percentile range ($${(percentile < 50 ? adjPct75 : adjPct90).toLocaleString()}) within 1-3 years.`;

    return {
      resumeStrengths: finalStrengths,
      resumeGaps: finalGaps,
      skillsToAdd: skillsToAdd.slice(0, 5),
      certifications: certifications.slice(0, 3),
      careerPaths,
      negotiationTips,
      actionPlan,
      overallAssessment,
    };
  }

  // ── Primary: Anthropic Claude LLM with chain-of-thought reasoning ──
  // ── Fallback: Rule-based expert system (labeled clearly in UI) ──
  async function callLLM(matched, salary, adjPct25, adjMedian, adjPct75, adjPct90, percentile, nearby, form) {
    setLlmLoading(true);
    setLlmError(null);
    setAnalysisMethod(null);
    try {
      const locMult = LOCATION_MULTIPLIERS[form.location] || 1;
      const nearbyTitles = nearby.map(n => `${n.title}: $${Math.round(n.a_median * locMult).toLocaleString()} median, $${Math.round(n.a_pct75 * locMult).toLocaleString()} 75th`).join("\n");

      const systemPrompt = `You are an expert career advisor and salary negotiation coach with deep knowledge of U.S. labor markets, resume optimization, and career advancement strategies.

Your analysis process (chain-of-thought — reason through each step):
1. RESUME COMPREHENSION: Read the full resume. Identify actual experience level, career trajectory, unique strengths, and the narrative their career tells.
2. MARKET POSITIONING: Compare their background against the BLS salary percentile data. Assess whether their experience justifies their current pay or suggests they're under/over-paid.
3. GAP ANALYSIS: Identify specific skills, experiences, or credentials missing from their resume that people at higher percentiles typically have.
4. CAREER PATHING: Map realistic next roles using the BLS comparison data. Each path must connect to something already on their resume.
5. NEGOTIATION STRATEGY: Tailor advice to their specific percentile — someone at the 20th percentile needs different tactics than someone at the 70th.
6. ACTIONABILITY: Every recommendation must be concrete and achievable within 12 months.`;

      const userPrompt = `Analyze this professional's salary and resume. Think step-by-step, then provide your structured recommendations.

SALARY BENCHMARKING (BLS OEWS data, adjusted for ${form.location}):
- Job title: ${form.jobTitle}
- Matched occupation: ${matched.title} (${matched.group})
- Current salary: $${salary.toLocaleString()}/year
- Location: ${form.location} (cost-of-living: ${locMult.toFixed(2)}x)
- Experience: ${form.yearsExperience || "Not specified"} years
- 10th percentile: $${Math.round(matched.a_pct10 * locMult).toLocaleString()}
- 25th percentile: $${adjPct25.toLocaleString()}
- MEDIAN (50th): $${adjMedian.toLocaleString()}
- 75th percentile: $${adjPct75.toLocaleString()}
- 90th percentile: $${adjPct90.toLocaleString()}
- Their position: ${Math.round(percentile)}th percentile (${salary >= adjMedian ? "+" : "-"}$${Math.abs(salary - adjMedian).toLocaleString()} from median)

RELATED ROLES FOR CAREER ADVANCEMENT:
${nearbyTitles}

RESUME:
${form.resumeText.substring(0, 4000)}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON. Reference specific details from the resume — do NOT give generic advice.

CRITICAL RULES:
- ALL career path salaries MUST be HIGHER than current salary of $${salary.toLocaleString()}. Never suggest a role paying less.
- ${salary > adjPct75 ? `This person already earns above the 75th percentile. Focus recommendations on leadership advancement, executive roles, equity/stock compensation, and transitioning to higher-paying adjacent fields rather than basic skill improvements.` : `Target the 75th percentile ($${adjPct75.toLocaleString()}) as the near-term goal.`}

{
  "resumeStrengths": ["3-4 strengths referencing actual resume content"],
  "resumeGaps": ["3-4 gaps with explanation of salary impact"],
  "skillsToAdd": ["4-5 high-ROI skills prioritized by salary impact"],
  "certifications": ["2-3 certs with estimated salary premium, e.g. 'AWS Solutions Architect (+12-15%)'"],
  "careerPaths": [
    {"role": "Title", "estimatedSalary": "$XXX,XXX", "timeframe": "X-Y years", "steps": "2-3 sentence roadmap tied to their background"}
  ],
  "negotiationTips": ["3 tips personalized to their percentile and strengths"],
  "actionPlan": [
    {"timeframe": "0-3 months", "actions": "specific to their gaps"},
    {"timeframe": "3-6 months", "actions": "builds on month 1-3"},
    {"timeframe": "6-12 months", "actions": "target transition or promotion"}
  ],
  "overallAssessment": "3-4 sentences referencing their specific experience, market position, and a concrete dollar target"
}`;

      const data = await callClaudeAPI({
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = data.content?.map(i => i.text || "").join("") || "";
      if (!text) throw new Error("Empty response");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!parsed.resumeStrengths || !parsed.overallAssessment) throw new Error("Incomplete");
      setLlmAnalysis(parsed);
      setAnalysisMethod("ai");
    } catch (err) {
      console.error("AI unavailable, using rule-based fallback:", err.message);
      const localResult = analyzeResumeLocally(matched, salary, adjMedian, adjPct75, adjPct90, percentile, nearby, form);
      setLlmAnalysis(localResult);
      setAnalysisMethod("rule-based");
    } finally {
      setLlmLoading(false);
    }
  }

  // ── Feature A: Career field switcher — Claude API ──
  async function analyzeFieldSwitch() {
    if (!targetField || !results) return;
    setSwitchLoading(true);
    setSwitchAnalysis(null);
    const { matched, salary, locMult } = results;
    const targetRoles = BLS_DATA
      .filter(r => r.group === targetField)
      .map(r => ({ title: r.title, median: Math.round(r.a_median * locMult), p75: Math.round(r.a_pct75 * locMult) }))
      .sort((a, b) => a.median - b.median);
    const targetRolesStr = targetRoles.map(r => `${r.title}: $${r.median.toLocaleString()} median, $${r.p75.toLocaleString()} 75th`).join("\n");

    try {
      const data = await callClaudeAPI({
        max_tokens: 2000,
        system: `You are a career transition advisor. You help people switch between professional fields by identifying transferable skills, bridge roles, and concrete transition plans. Think step-by-step:
1. Read their resume to understand their actual capabilities
2. Map each capability to its equivalent in the target field
3. Identify "bridge roles" that combine both fields
4. Create a realistic timeline with specific milestones`,
        messages: [{ role: "user", content: `This person wants to switch from ${matched.group} to ${targetField}.

CURRENT ROLE: ${matched.title} (${matched.group})
CURRENT SALARY: $${salary.toLocaleString()}
LOCATION: ${formData.location}

THEIR RESUME:
${formData.resumeText.substring(0, 4000)}

AVAILABLE ROLES IN TARGET FIELD (${targetField}):
${targetRolesStr}

Think carefully about which skills transfer and which don't. Then respond ONLY with valid JSON:
{
  "transferableSkills": [
    {"skill": "specific skill from resume", "currentContext": "how they use it now", "targetContext": "how it applies in new field"}
  ],
  "skillGaps": [
    {"skill": "missing skill", "importance": "critical|important|nice-to-have", "howToLearn": "specific course/resource/project"}
  ],
  "bridgeRoles": [
    {"role": "Job Title", "salary": "$XX,XXX", "why": "Why this bridges both fields", "timeToReach": "X months"}
  ],
  "realisticFirstRole": {"title": "Entry role in new field", "salary": "$XX,XXX", "timeframe": "X-Y months"},
  "ultimateTarget": {"title": "Goal role after 3-5 years", "salary": "$XX,XXX"},
  "transitionPlan": [
    {"phase": "Month 1-3", "actions": "specific actions"},
    {"phase": "Month 4-6", "actions": "specific actions"},
    {"phase": "Month 7-12", "actions": "specific actions"}
  ],
  "salaryTrajectory": "Description of expected salary changes during transition",
  "riskAssessment": "Honest assessment of transition difficulty and potential salary dip"
}` }],
      });
      const text = data.content?.map(i => i.text || "").join("") || "";
      if (!text) throw new Error("Empty");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setSwitchAnalysis(parsed);
    } catch (err) {
      console.error("Field switch analysis failed:", err.message);
      // Fallback: basic salary comparison without AI analysis
      const entryRoles = targetRoles.slice(0, 3);
      const seniorRoles = targetRoles.slice(-3);
      setSwitchAnalysis({
        fallback: true,
        transferableSkills: [{ skill: "Communication & collaboration", currentContext: "Current role", targetContext: "Valued in all fields" }],
        skillGaps: [{ skill: `Core ${targetField} domain knowledge`, importance: "critical", howToLearn: "Online courses, bootcamps, or certificate programs" }],
        bridgeRoles: entryRoles.map(r => ({ role: r.title, salary: `$${r.median.toLocaleString()}`, why: "Entry-level role in target field", timeToReach: "6-12 months" })),
        realisticFirstRole: { title: entryRoles[0]?.title || "Entry-level role", salary: `$${entryRoles[0]?.median?.toLocaleString() || "N/A"}`, timeframe: "6-12 months" },
        ultimateTarget: { title: seniorRoles[seniorRoles.length - 1]?.title || "Senior role", salary: `$${seniorRoles[seniorRoles.length - 1]?.p75?.toLocaleString() || "N/A"}` },
        transitionPlan: [
          { phase: "Month 1-3", actions: `Research ${targetField} roles, begin foundational coursework, network with professionals in the field` },
          { phase: "Month 4-6", actions: "Build portfolio projects, earn relevant certification, apply to bridge roles" },
          { phase: "Month 7-12", actions: "Transition to bridge role or entry-level position in target field" },
        ],
        salaryTrajectory: `Entry roles in ${targetField} range from $${entryRoles[0]?.median?.toLocaleString() || "N/A"} to $${entryRoles[entryRoles.length - 1]?.median?.toLocaleString() || "N/A"}. Senior roles reach $${seniorRoles[seniorRoles.length - 1]?.p75?.toLocaleString() || "N/A"} at the 75th percentile.`,
        riskAssessment: "Career transitions typically involve a temporary salary adjustment. Plan for 3-6 months of reduced income during the transition period.",
      });
    } finally {
      setSwitchLoading(false);
    }
  }

  // ── Feature B: Resume rewriter — Claude API ──
  async function rewriteResume() {
    if (!formData.resumeText || formData.resumeText.length < 30 || !results) return;
    setRewriteLoading(true);
    setResumeRewrite(null);
    const { matched, salary, adjMedian, adjPct75, adjPct90, percentile } = results;
    // Target salary should always be HIGHER than current
    const targetSalary = Math.max(adjPct75, Math.round(salary * 1.2), adjPct90);
    const targetPct = salary > adjPct75 ? 90 : 75;
    try {
      const data = await callClaudeAPI({
        max_tokens: 2500,
        system: `You are an expert resume writer and ATS optimization specialist.

CRITICAL RULES:
1. SKIP headers, contact info, names, addresses, phone numbers, emails, LinkedIn URLs — do NOT rewrite these
2. SKIP section headers like "Education", "Experience", "Skills" — do NOT rewrite these
3. ONLY rewrite actual experience bullet points and job descriptions
4. Start every bullet with a strong action verb (Led, Engineered, Analyzed, Delivered, Optimized)
5. Add quantified metrics — if no numbers exist, add [X%] or [X] as placeholders
6. Include specific tools, technologies, or methodologies
7. End with business impact: revenue, cost savings, efficiency gains
8. Never invent achievements — only reframe what's already there
9. Optimize for ATS keywords from the target occupation`,
        messages: [{ role: "user", content: `Rewrite this resume to target: ${matched.title} at the ${targetPct}th percentile ($${targetSalary.toLocaleString()}/year) in ${formData.location}.

Current salary: $${salary.toLocaleString()} (${Math.round(percentile)}th percentile)
Target: $${targetSalary.toLocaleString()} (${targetPct}th percentile)
${jobDescription ? `
SPECIFIC JOB DESCRIPTION TO TARGET (optimize resume specifically for this role):
${jobDescription.substring(0, 2000)}
${jobUrl ? `Job URL: ${jobUrl}` : ""}

Extract the key requirements, skills, and qualifications from this job description and make sure the rewritten resume addresses each one.
` : ""}
RESUME TEXT:
${formData.resumeText.substring(0, 3500)}

Respond ONLY with valid JSON:
{
  "rewrites": [
    {
      "original": "exact original bullet text",
      "improved": "rewritten version with metrics and action verbs",
      "issues": ["passive voice", "no metrics", "vague"],
      "explanation": "1 sentence on what changed and why it matters"
    }
  ],
  "newSummary": "A 2-3 sentence professional summary${jobDescription ? " tailored to the specific job description" : ` optimized for ${matched.title}`}",
  "atsKeywords": ["keywords found on resume that match ${jobDescription ? "the job description" : "the target role"}"],
  "missingKeywords": ["important keywords NOT on resume${jobDescription ? " but required by the job description" : " that should be added"}"],
  "overallScore": 55,
  "improvedScore": 85,
  "topTip": "The single most impactful change${jobDescription ? " to match this specific job" : " they should make"}"
}` }],
      });
      const text = data.content?.map(i => i.text || "").join("") || "";
      if (!text) throw new Error("Empty");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResumeRewrite(parsed);
    } catch (err) {
      console.error("Resume rewrite API unavailable, using rule-based engine:", err.message);
      // ── Full rule-based resume rewriter ──
      const text = formData.resumeText;
      // Skip headers, contact info, section labels, and short fragments
      const SKIP_PATTERNS = [
        /^[\w\s]*@[\w.]+/i,                    // email addresses
        /^https?:\/\//i,                        // URLs
        /^linkedin\.com|github\.com/i,          // social links
        /^\+?\d[\d\s\-()]{6,}/,                // phone numbers
        /^\d{3,5}\s/,                           // zip/area codes at start
        /^(education|experience|skills|projects|work history|certifications|awards|summary|objective|professional|technical|references|languages|interests|hobbies|volunteer|publications|courses)\s*:?\s*$/i, // section headers
        /^(university|college|school|institute|bachelor|master|m\.s\.|b\.s\.|b\.a\.|m\.a\.|mba|phd|gpa|degree)\b/i, // education lines
        /^[A-Z][a-z]+\s[A-Z][a-z]+\s*$/,       // likely a person's name (First Last)
        /^[A-Z\s,]+$/,                          // ALL CAPS headers
        /^\w+,\s*\w+\s*\|/,                     // "City, State | Phone" format
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i, // date lines
      ];
      const bullets = text.split(/[\n•\-\*\u2022]/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 500)
        .filter(s => !SKIP_PATTERNS.some(p => p.test(s)))
        .filter(s => s.split(/\s+/).length >= 4); // at least 4 words

      // Weak pattern detectors
      const WEAK_PATTERNS = [
        { regex: /^(responsible for|in charge of|tasked with|duties included)/i, issue: "passive voice", fix: "action verb" },
        { regex: /^(helped|assisted|supported|aided|contributed to|participated in)/i, issue: "weak verb", fix: "ownership verb" },
        { regex: /^(worked on|worked with|involved in|was part of)/i, issue: "vague ownership", fix: "specific contribution" },
        { regex: /^(did|made|got|had|used|ran)/i, issue: "weak verb", fix: "strong action verb" },
        { regex: /various|several|many|multiple|numerous|some/i, issue: "vague quantity", fix: "specific number [X]" },
        { regex: /etc\.|and more|and so on|things like/i, issue: "trailing vagueness", fix: "specific list" },
        { regex: /team player|hard worker|self-starter|detail-oriented|fast learner/i, issue: "cliché", fix: "demonstrated example" },
        { regex: /^(I |my )/i, issue: "first person", fix: "remove pronoun" },
      ];

      const NO_METRICS = { test: (s) => !/\d/.test(s), issue: "no metrics", fix: "add [X%] or [X] placeholder" };
      const TOO_SHORT = { test: (s) => s.split(/\s+/).length < 6, issue: "too brief", fix: "add context and impact" };
      const NO_IMPACT = { test: (s) => !/(?:result|impact|increase|decrease|improve|reduc|sav|grew|boost|generat|deliver|achiev|launch|creat|built|develop|design|implement|automat|streamlin|optimiz)/i.test(s), issue: "no impact language", fix: "add outcome/result" };

      // Action verb upgrades
      const VERB_UPGRADES = {
        "helped": "Facilitated", "assisted": "Supported", "worked on": "Developed", "worked with": "Collaborated with",
        "responsible for": "Led", "in charge of": "Directed", "tasked with": "Executed", "did": "Performed",
        "made": "Produced", "got": "Secured", "had": "Maintained", "used": "Leveraged", "ran": "Managed",
        "was part of": "Contributed to", "involved in": "Engaged in", "participated in": "Drove",
        "contributed to": "Spearheaded", "created": "Designed and built", "handled": "Managed",
        "managed": "Oversaw", "organized": "Coordinated", "taught": "Trained", "learned": "Mastered",
        "improved": "Optimized", "changed": "Transformed", "started": "Initiated", "fixed": "Resolved",
        "found": "Identified", "showed": "Demonstrated", "told": "Communicated", "gave": "Delivered",
        "set up": "Established", "looked at": "Analyzed", "put together": "Assembled",
      };

      // Detect skills from resume for ATS analysis
      const resumeLower = text.toLowerCase();
      const targetGroup = matched.group;
      const foundAtsKeywords = [];
      const missingAtsKeywords = [];

      const GROUP_KEYWORDS = {
        "Computer and Mathematical": ["python","sql","javascript","react","aws","docker","machine learning","data analysis","agile","git","api","cloud","database","linux","ci/cd","algorithms"],
        "Business and Financial": ["excel","financial analysis","budgeting","forecasting","accounting","gaap","sap","erp","risk management","compliance","audit","reporting","quickbooks","powerpoint"],
        "Management": ["leadership","strategic planning","p&l","budget management","cross-functional","stakeholder","kpi","okr","change management","team building","operations","revenue growth"],
        "Healthcare Practitioners": ["patient care","ehr","epic","hipaa","clinical","assessment","treatment planning","medical records","bls","acls","charting","telehealth","evidence-based"],
        "Education": ["curriculum","lesson planning","assessment","differentiated instruction","classroom management","student engagement","iep","common core","lms","canvas","pedagogy"],
        "Sales": ["crm","salesforce","pipeline","quota","prospecting","lead generation","negotiation","cold calling","account management","revenue","closing","b2b","territory"],
        "Arts, Design, Entertainment": ["adobe","photoshop","figma","illustrator","content strategy","seo","social media","branding","ux","user research","analytics","campaign","copywriting"],
        "Legal": ["legal research","westlaw","contract","litigation","compliance","regulatory","case management","discovery","brief writing","client relations"],
        "Construction and Extraction": ["osha","blueprint","safety","project scheduling","estimation","quality control","heavy equipment","building code","inspection","permit"],
        "Architecture and Engineering": ["cad","autocad","revit","solidworks","project management","fea","simulation","matlab","gis","pe license","leed"],
      };

      const groupKws = GROUP_KEYWORDS[targetGroup] || GROUP_KEYWORDS["Management"];
      for (const kw of groupKws) {
        if (resumeLower.includes(kw)) foundAtsKeywords.push(kw);
        else missingAtsKeywords.push(kw);
      }

      // Score the resume
      let score = 40;
      if (bullets.length >= 5) score += 5;
      if (bullets.length >= 10) score += 5;
      if (/\d/.test(text)) score += 10;
      if (foundAtsKeywords.length >= 3) score += 10;
      if (foundAtsKeywords.length >= 6) score += 5;
      const hasActionVerbs = bullets.filter(b => /^(Led|Managed|Developed|Built|Designed|Analyzed|Created|Delivered|Implemented|Optimized|Engineered|Launched|Directed|Spearheaded)/i.test(b)).length;
      score += Math.min(hasActionVerbs * 3, 15);
      score = Math.min(score, 75);

      // Rewrite each bullet
      const rewrites = bullets.slice(0, 8).map(bullet => {
        const issues = [];
        let improved = bullet;

        // Check each pattern
        for (const p of WEAK_PATTERNS) {
          if (p.regex.test(bullet)) issues.push(p.issue);
        }
        if (NO_METRICS.test(bullet)) issues.push(NO_METRICS.issue);
        if (TOO_SHORT.test(bullet)) issues.push(TOO_SHORT.issue);
        if (NO_IMPACT.test(bullet)) issues.push(NO_IMPACT.issue);

        // Apply verb upgrades
        for (const [weak, strong] of Object.entries(VERB_UPGRADES)) {
          const re = new RegExp(`^${weak}\\b`, "i");
          if (re.test(improved)) {
            improved = improved.replace(re, strong);
            break;
          }
        }

        // Remove first person
        improved = improved.replace(/^I /i, "").replace(/^my /i, "");

        // Capitalize first letter
        improved = improved.charAt(0).toUpperCase() + improved.slice(1);

        // Add metrics placeholder if no numbers
        if (NO_METRICS.test(improved) && !improved.includes("[")) {
          if (/(?:team|group|people|staff|member|report)/i.test(improved)) {
            improved = improved.replace(/(team|group|staff)/i, "team of [X]");
          } else if (/(?:project|initiative|campaign|program)/i.test(improved)) {
            improved += ", resulting in [X%] improvement in [key metric]";
          } else if (/(?:report|dashboard|analysis|document)/i.test(improved)) {
            improved += " for [X] stakeholders, reducing [process] time by [X%]";
          } else {
            improved += ", impacting [X] users/clients and achieving [X%] improvement";
          }
        }

        // Add impact language if missing
        if (NO_IMPACT.test(bullet) && !improved.includes("resulting") && !improved.includes("impacting") && !improved.includes("achieving")) {
          improved += " — driving measurable [outcome]";
        }

        // Replace vague quantities
        improved = improved.replace(/\b(various|several|many|multiple|numerous)\b/gi, "[X]");

        const explanation = issues.length > 0
          ? `Fixed: ${issues.join(", ")}. Strong bullets start with action verbs, include numbers, and end with business impact.`
          : "Minor improvements for ATS optimization and impact clarity.";

        return { original: bullet, improved, issues: issues.length > 0 ? issues : ["minor polish"], explanation };
      });

      // Generate professional summary
      const jobTitle = formData.jobTitle;
      const yrs = formData.yearsExperience || "several";
      const topSkills = foundAtsKeywords.slice(0, 4).join(", ");
      const resumeTargetSalary = Math.max(adjPct75, Math.round(salary * 1.2), adjPct90);
      const newSummary = `Results-driven ${jobTitle} with ${yrs} years of experience in ${topSkills || matched.group.toLowerCase()}. Proven track record of delivering measurable outcomes and driving ${targetGroup === "Business and Financial" ? "revenue growth and operational efficiency" : targetGroup === "Healthcare Practitioners" ? "patient outcomes and clinical excellence" : targetGroup === "Education" ? "student achievement and curriculum innovation" : "high-impact results across cross-functional initiatives"}. Seeking to leverage expertise to contribute at the $${resumeTargetSalary.toLocaleString()}+ level in a ${salary > adjPct75 ? "senior " : ""}${matched.title} role.`;

      const improvedScore = Math.min(score + 20 + rewrites.filter(r => r.issues.length > 0).length * 3, 92);

      setResumeRewrite({
        fallback: true,
        rewrites,
        newSummary,
        atsKeywords: foundAtsKeywords.slice(0, 8),
        missingKeywords: missingAtsKeywords.slice(0, 8),
        overallScore: score,
        improvedScore,
        topTip: issues_top_tip(rewrites, missingAtsKeywords, score),
      });
    } finally {
      setRewriteLoading(false);
    }
  }

  function issues_top_tip(rewrites, missing, score) {
    const allIssues = rewrites.flatMap(r => r.issues);
    const counts = {};
    allIssues.forEach(i => counts[i] = (counts[i] || 0) + 1);
    const topIssue = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    if (topIssue?.[0] === "no metrics") return `Your biggest opportunity: ${topIssue[1]} of your ${rewrites.length} bullets have no numbers. Adding specific metrics (team size, percentage improvements, dollar amounts, user counts) is the single highest-impact change for getting past ATS screening and impressing hiring managers.`;
    if (topIssue?.[0] === "weak verb" || topIssue?.[0] === "passive voice") return `${topIssue[1]} of your bullets start with weak or passive language. Replace "responsible for," "helped with," and "worked on" with ownership verbs like Led, Developed, Delivered, and Optimized. This signals seniority and initiative.`;
    if (topIssue?.[0] === "no impact language") return `Most of your bullets describe tasks but not outcomes. For each bullet, ask yourself: "So what? What was the result?" Then add that result. Even estimated outcomes work: "reducing processing time by approximately 30%."`;
    if (missing.length > 4) return `Your resume is missing ${missing.length} important keywords for ${matched?.title || "your target role"}: ${missing.slice(0, 4).join(", ")}. ATS systems scan for these terms — adding them naturally into your bullets can significantly improve your callback rate.`;
    return `Your resume scores ${score}/100. The biggest gains come from adding quantified metrics to every bullet and ensuring you include industry keywords like ${missing.slice(0, 3).join(", ")} for ATS optimization.`;
  }

  // ── Feature D: Job search — find higher-paying roles ──
  async function searchHigherPayingJobs() {
    if (!results) return;
    setJobSearchLoading(true);
    setJobSearchResults(null);
    const { matched, salary, locMult, nearby } = results;
    try {
      const data = await callClaudeAPI({
        max_tokens: 2000,
        system: `You are a career strategist who helps people find higher-paying jobs. You know the current job market, which companies pay well, and how to search effectively. Be specific — name actual companies, job boards, and search strategies.`,
        messages: [{ role: "user", content: `This person is a ${formData.jobTitle} earning $${salary.toLocaleString()} in ${formData.location} (${Math.round(results.percentile)}th percentile for ${matched.title}). They have ${formData.yearsExperience || "several"} years of experience.

Their resume highlights:
${formData.resumeText.substring(0, 2000)}

Related higher-paying roles from BLS data:
${nearby.map(n => `${n.title}: $${Math.round(n.a_median * locMult).toLocaleString()} median`).join("\n")}

Respond ONLY with valid JSON:
{
  "targetRoles": [
    {"title": "Specific job title to search for", "salaryRange": "$XXK-$XXXK", "whyGoodFit": "1 sentence connecting to their resume", "searchQuery": "exact search string for LinkedIn/Indeed"}
  ],
  "topCompanies": [
    {"name": "Company Name", "whyGoodFit": "1 sentence", "typicalSalary": "$XXXK+"}
  ],
  "jobBoards": [
    {"name": "Platform name", "url": "https://...", "searchTip": "How to search effectively on this platform"}
  ],
  "searchStrategy": "2-3 sentence strategy for their specific situation",
  "salaryNegotiationLeverage": "What makes them valuable based on their resume"
}` }],
      });
      const text = data.content?.map(i => i.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setJobSearchResults(parsed);
    } catch (err) {
      console.error("Job search failed:", err.message);
      // Fallback: generate search links from BLS data
      const higherRoles = nearby.filter(n => Math.round(n.a_median * locMult) > salary).slice(0, 5);
      const searchBase = encodeURIComponent(formData.location.split(",")[0]);
      setJobSearchResults({
        fallback: true,
        targetRoles: higherRoles.map(r => ({
          title: r.title,
          salaryRange: `$${Math.round(r.a_median * locMult * 0.9 / 1000)}K-$${Math.round(r.a_pct75 * locMult / 1000)}K`,
          whyGoodFit: `Related role in ${r.group} with higher median pay`,
          searchQuery: r.title,
        })),
        topCompanies: [],
        jobBoards: [
          { name: "LinkedIn Jobs", url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(formData.jobTitle)}&location=${searchBase}`, searchTip: "Set salary filter above your current pay" },
          { name: "Indeed", url: `https://www.indeed.com/jobs?q=${encodeURIComponent(formData.jobTitle)}&l=${searchBase}`, searchTip: "Use the salary estimate filter" },
          { name: "Glassdoor", url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(formData.jobTitle)}`, searchTip: "Check company reviews and salary reports" },
        ],
        searchStrategy: `Focus on roles paying above $${Math.round(salary * 1.15 / 1000)}K. Search for both your current title and related higher-paying titles in ${formData.location}.`,
        salaryNegotiationLeverage: `Your experience as a ${formData.jobTitle} with ${formData.yearsExperience || "multiple"} years positions you for roles in the $${Math.round(salary * 1.15 / 1000)}K-$${Math.round(salary * 1.4 / 1000)}K range.`,
      });
    } finally {
      setJobSearchLoading(false);
    }
  }

  // ── Handle PDF text extraction (simplified: user pastes or we read) ──
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Try to extract readable content
      const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, "\n").trim();
      if (cleaned.length > 50) {
        setFormData(prev => ({ ...prev, resumeText: cleaned.substring(0, 5000) }));
      } else {
        alert("Could not extract text from this PDF. Please paste your resume text directly into the text box.");
      }
    } catch {
      alert("Error reading file. Please paste your resume text directly.");
    }
  }

  const fmt = (n) => "$" + Math.round(n).toLocaleString();

  // ─── RENDER: Input Form ─────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: palette.bg, minHeight: "100vh", color: palette.textPrimary, padding: "0" }}>
        <style>{fonts}{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          input, select, textarea { font-family: 'DM Sans', sans-serif; }
          ::placeholder { color: ${palette.textDim}; }
          input:focus, select:focus, textarea:focus { outline: none; border-color: ${palette.accent} !important; box-shadow: 0 0 0 3px ${palette.accent}22; }
          @keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
          @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
          .fadein { animation: fadeUp 0.6s ease both; }
          .fadein-1 { animation-delay: 0.1s; }
          .fadein-2 { animation-delay: 0.2s; }
          .fadein-3 { animation-delay: 0.3s; }
          .fadein-4 { animation-delay: 0.4s; }
        `}</style>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
          {/* Header */}
          <div className="fadein" style={{ marginBottom: 48, textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${palette.accent}, ${palette.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💰</div>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: palette.accent }}>Salary Optimization Advisor</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 12 }}>
              Unlock Your Earning Potential
            </h1>
            <p style={{ color: palette.textSecondary, fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
              Get personalized salary benchmarking powered by BLS data and AI-driven resume analysis.
            </p>
          </div>

          {/* Form */}
          <div className="fadein fadein-1" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 16, padding: 32 }}>
            {/* Job Title */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: palette.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>JOB TITLE *</label>
              <input
                type="text"
                placeholder='e.g. "Registered Nurses", "Marketing Managers", "Electricians"'
                value={formData.jobTitle}
                onChange={e => setFormData(p => ({...p, jobTitle: e.target.value}))}
                style={{ width: "100%", padding: "12px 16px", background: palette.inputBg, border: `1px solid ${palette.inputBorder}`, borderRadius: 10, color: palette.textPrimary, fontSize: 15 }}
              />
              <p style={{ fontSize: 12, color: palette.textDim, marginTop: 6 }}>259 occupations across all industries — healthcare, business, trades, education, tech, and more</p>
            </div>

            {/* Salary + Experience row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: palette.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>CURRENT SALARY ($) *</label>
                <input
                  type="number"
                  placeholder="85000"
                  value={formData.currentSalary}
                  onChange={e => setFormData(p => ({...p, currentSalary: e.target.value}))}
                  style={{ width: "100%", padding: "12px 16px", background: palette.inputBg, border: `1px solid ${palette.inputBorder}`, borderRadius: 10, color: palette.textPrimary, fontSize: 15 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: palette.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>YEARS OF EXPERIENCE</label>
                <input
                  type="number"
                  placeholder="3"
                  value={formData.yearsExperience}
                  onChange={e => setFormData(p => ({...p, yearsExperience: e.target.value}))}
                  style={{ width: "100%", padding: "12px 16px", background: palette.inputBg, border: `1px solid ${palette.inputBorder}`, borderRadius: 10, color: palette.textPrimary, fontSize: 15 }}
                />
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: palette.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>LOCATION *</label>
              <select
                value={formData.location}
                onChange={e => setFormData(p => ({...p, location: e.target.value}))}
                style={{ width: "100%", padding: "12px 16px", background: palette.inputBg, border: `1px solid ${palette.inputBorder}`, borderRadius: 10, color: palette.textPrimary, fontSize: 15, cursor: "pointer" }}
              >
                {Object.keys(LOCATION_MULTIPLIERS).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Resume */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: palette.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>RESUME (paste text or upload .txt)</label>
              <textarea
                placeholder="Paste your resume text here for AI-powered analysis. Include skills, experience, education..."
                value={formData.resumeText}
                onChange={e => setFormData(p => ({...p, resumeText: e.target.value}))}
                rows={6}
                style={{ width: "100%", padding: "12px 16px", background: palette.inputBg, border: `1px solid ${palette.inputBorder}`, borderRadius: 10, color: palette.textPrimary, fontSize: 14, resize: "vertical", lineHeight: 1.6 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${palette.inputBorder}`, borderRadius: 8, color: palette.textSecondary, fontSize: 13, cursor: "pointer" }}
                >
                  📎 Upload .txt file
                </button>
                <span style={{ fontSize: 12, color: palette.textDim }}>Or paste resume text above</span>
                <input ref={fileInputRef} type="file" accept=".txt,.text" onChange={handleFileUpload} style={{ display: "none" }} />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={analyze}
              disabled={!formData.jobTitle || !formData.currentSalary}
              style={{
                width: "100%", padding: "14px 24px",
                background: (!formData.jobTitle || !formData.currentSalary) ? palette.inputBorder : `linear-gradient(135deg, ${palette.accent}, ${palette.purple})`,
                border: "none", borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 600,
                cursor: (!formData.jobTitle || !formData.currentSalary) ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              Analyze My Salary →
            </button>
          </div>

          {/* Data Source */}
          <div className="fadein fadein-3" style={{ marginTop: 28, background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>📊</span>
              <div>
                <p style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.6, marginBottom: 6 }}>
                  <strong style={{ color: palette.textPrimary }}>Data Source:</strong> U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics (OEWS)
                </p>
                <p style={{ fontSize: 12, color: palette.textDim, lineHeight: 1.5 }}>
                  259 occupations across 22 industry groups • Salary percentiles (10th–90th) from national BLS estimates • Location adjustments based on cost-of-living indices • AI resume analysis powered by Claude (Anthropic)
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                  <a href="https://www.bls.gov/oes/tables.htm" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>📥 BLS OEWS Data Tables</a>
                  <a href="https://www.bls.gov/oes/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>📋 OEWS Program Overview</a>
                  <a href="https://www.bls.gov/ooh/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>📖 Occupational Outlook Handbook</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Loading ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: palette.bg, minHeight: "100vh", color: palette.textPrimary, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{fonts}{`
          @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, border: `3px solid ${palette.cardBorder}`, borderTopColor: palette.accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Running AI analysis...</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: animStage >= 0 ? palette.green : palette.textDim, transition: "color 0.4s" }}>
              {animStage >= 0 ? "✓" : "○"} Matching BLS occupation data
            </span>
            <span style={{ fontSize: 14, color: animStage >= 1 ? palette.green : palette.textDim, transition: "color 0.4s" }}>
              {animStage >= 1 ? "✓" : "○"} Adjusting for location cost-of-living
            </span>
            <span style={{ fontSize: 14, color: animStage >= 2 ? palette.green : palette.textDim, transition: "color 0.4s" }}>
              {animStage >= 2 ? "✓" : "○"} Sending resume to Claude LLM for analysis
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Results ────────────────────────────────────────────────
  if (!results || results.error) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: palette.bg, minHeight: "100vh", color: palette.textPrimary, padding: 48, textAlign: "center" }}>
        <style>{fonts}</style>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>{results?.message || "Something went wrong"}</h2>
          <button onClick={() => { setStep(0); setResults(null); }} style={{ padding: "10px 24px", background: palette.accent, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, cursor: "pointer", marginTop: 16 }}>
            ← Try Again
          </button>
        </div>
      </div>
    );
  }

  const { matched, salary, adjPct10, adjPct25, adjMedian, adjPct75, adjPct90, percentile, gap, nearby, locMult } = results;
  const gapColor = gap >= 0 ? palette.green : gap > -10000 ? palette.amber : palette.red;
  const gapLabel = gap >= 0 ? "Above Median" : "Below Median";

  // Chart data
  const percentileChartData = [
    { name: "10th", value: adjPct10, fill: palette.textDim },
    { name: "25th", value: adjPct25, fill: palette.purple },
    { name: "Median", value: adjMedian, fill: palette.accent },
    { name: "75th", value: adjPct75, fill: palette.green },
    { name: "90th", value: adjPct90, fill: palette.amber },
    { name: "You", value: salary, fill: "#fff" },
  ];

  const comparisonData = nearby.slice(0, 4).map(n => ({
    name: n.title.length > 22 ? n.title.substring(0, 20) + "…" : n.title,
    median: Math.round(n.a_median * locMult),
    p75: Math.round(n.a_pct75 * locMult),
  }));
  comparisonData.unshift({
    name: matched.title.length > 22 ? matched.title.substring(0, 20) + "…" : matched.title,
    median: adjMedian,
    p75: adjPct75,
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: palette.bg, minHeight: "100vh", color: palette.textPrimary }}>
      <style>{fonts}{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        .fi { animation: fadeUp 0.5s ease both; }
        .fi1 { animation-delay: 0.05s; } .fi2 { animation-delay: 0.1s; }
        .fi3 { animation-delay: 0.15s; } .fi4 { animation-delay: 0.2s; }
        .fi5 { animation-delay: 0.25s; } .fi6 { animation-delay: 0.3s; }
        .recharts-default-tooltip { background: ${palette.card} !important; border: 1px solid ${palette.cardBorder} !important; border-radius: 8px !important; }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 20px 60px" }}>
        {/* Back + Header */}
        <div className="fi fi1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <button onClick={() => { setStep(0); setResults(null); setLlmAnalysis(null); setLlmError(null); setAnalysisMethod(null); setTargetField(""); setSwitchAnalysis(null); setResumeRewrite(null); setJobSearchResults(null); setJobDescription(""); setJobUrl(""); }} style={{ padding: "8px 16px", background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.textSecondary, fontSize: 13, cursor: "pointer" }}>
            ← New Analysis
          </button>
          <span style={{ fontSize: 13, color: palette.textDim }}>BLS OEWS Data • {formData.location}</span>
        </div>

        {/* Title Row */}
        <div className="fi fi1" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Salary Report: {matched.title}</h1>
          <p style={{ color: palette.textSecondary, fontSize: 14, marginTop: 4 }}>
            {matched.group} • Location multiplier: {locMult}x
          </p>
        </div>

        {/* KPI Cards */}
        <div className="fi fi2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Your Salary", value: fmt(salary), color: "#fff" },
            { label: "Market Median", value: fmt(adjMedian), color: palette.accent },
            { label: "Gap from Median", value: (gap >= 0 ? "+" : "") + fmt(Math.abs(gap)), color: gapColor, sub: gapLabel },
            { label: "Your Percentile", value: `${percentile}th`, color: percentile >= 50 ? palette.green : palette.amber },
          ].map((kpi, i) => (
            <div key={i} style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: "20px 18px" }}>
              <div style={{ fontSize: 12, color: palette.textDim, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>{kpi.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              {kpi.sub && <div style={{ fontSize: 12, color: kpi.color, marginTop: 4 }}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Salary Distribution Bar */}
        <div className="fi fi3" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Salary Distribution — {matched.title}</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={percentileChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.cardBorder} />
                <XAxis dataKey="name" tick={{ fill: palette.textSecondary, fontSize: 12 }} axisLine={{ stroke: palette.cardBorder }} />
                <YAxis tick={{ fill: palette.textSecondary, fontSize: 12 }} axisLine={{ stroke: palette.cardBorder }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Salary"]} contentStyle={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.textPrimary }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {percentileChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} opacity={entry.name === "You" ? 1 : 0.7} stroke={entry.name === "You" ? "#fff" : "none"} strokeWidth={entry.name === "You" ? 2 : 0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, justifyContent: "center" }}>
            {[["10th", adjPct10], ["25th", adjPct25], ["Median", adjMedian], ["75th", adjPct75], ["90th", adjPct90]].map(([l, v]) => (
              <span key={l} style={{ fontSize: 12, color: palette.textDim }}>{l}: <strong style={{ color: palette.textSecondary }}>{fmt(v)}</strong></span>
            ))}
          </div>
        </div>

        {/* Related Roles Comparison */}
        <div className="fi fi4" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Related Roles — Median vs. 75th Percentile</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.cardBorder} />
                <XAxis type="number" tick={{ fill: palette.textSecondary, fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={{ stroke: palette.cardBorder }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: palette.textSecondary, fontSize: 11 }} axisLine={{ stroke: palette.cardBorder }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} contentStyle={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.textPrimary }} />
                <Legend />
                <Bar dataKey="median" fill={palette.accent} name="Median" radius={[0, 4, 4, 0]} opacity={0.8} />
                <Bar dataKey="p75" fill={palette.green} name="75th Pct" radius={[0, 4, 4, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Resume Analysis */}
        <div className="fi fi5" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${palette.accent}, ${palette.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>AI-Powered Resume Analysis</h3>
            {analysisMethod && (
              <span style={{
                padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginLeft: "auto",
                background: analysisMethod === "ai" ? `${palette.green}22` : `${palette.amber}22`,
                color: analysisMethod === "ai" ? palette.green : palette.amber,
                border: `1px solid ${analysisMethod === "ai" ? palette.green : palette.amber}44`,
              }}>
                {analysisMethod === "ai" ? "Claude LLM" : "Rule-based fallback"}
              </span>
            )}
          </div>

          {llmLoading && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 14, color: palette.textSecondary, animation: "pulse 1.5s ease infinite" }}>
                Analyzing your resume with AI...
              </div>
            </div>
          )}

          {llmError && (
            <div style={{ padding: 16, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.cardBorder}` }}>
              <p style={{ color: palette.amber, fontSize: 14 }}>{llmError}</p>
            </div>
          )}

          {llmAnalysis?.skipped && (
            <div style={{ padding: 16, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.cardBorder}` }}>
              <p style={{ color: palette.textSecondary, fontSize: 14 }}>No resume provided. Go back and paste your resume text for personalized AI recommendations.</p>
            </div>
          )}

          {llmAnalysis && !llmAnalysis.skipped && (
            <div>
              {/* Overall Assessment */}
              {llmAnalysis.overallAssessment && (
                <div style={{ padding: 16, background: `${palette.accent}11`, borderRadius: 10, border: `1px solid ${palette.accent}33`, marginBottom: 20 }}>
                  <p style={{ color: palette.textPrimary, fontSize: 14, lineHeight: 1.6 }}>{llmAnalysis.overallAssessment}</p>
                </div>
              )}

              {/* Strengths + Gaps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.green, marginBottom: 10, letterSpacing: 0.5 }}>✓ STRENGTHS</h4>
                  {llmAnalysis.resumeStrengths?.map((s, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: `${palette.green}11`, borderRadius: 8, marginBottom: 6, fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>{s}</div>
                  ))}
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.red, marginBottom: 10, letterSpacing: 0.5 }}>✗ GAPS TO ADDRESS</h4>
                  {llmAnalysis.resumeGaps?.map((g, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: `${palette.red}11`, borderRadius: 8, marginBottom: 6, fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>{g}</div>
                  ))}
                </div>
              </div>

              {/* Skills to Add */}
              {llmAnalysis.skillsToAdd && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.purple, marginBottom: 10, letterSpacing: 0.5 }}>🎯 SKILLS TO ADD</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {llmAnalysis.skillsToAdd.map((s, i) => (
                      <span key={i} style={{ padding: "6px 14px", background: `${palette.purple}22`, border: `1px solid ${palette.purple}44`, borderRadius: 20, fontSize: 13, color: palette.textSecondary }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {llmAnalysis.certifications && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.amber, marginBottom: 10, letterSpacing: 0.5 }}>📜 RECOMMENDED CERTIFICATIONS</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {llmAnalysis.certifications.map((c, i) => (
                      <span key={i} style={{ padding: "6px 14px", background: `${palette.amber}22`, border: `1px solid ${palette.amber}44`, borderRadius: 20, fontSize: 13, color: palette.textSecondary }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Paths */}
              {llmAnalysis.careerPaths && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.accent, marginBottom: 10, letterSpacing: 0.5 }}>🚀 CAREER ADVANCEMENT PATHS</h4>
                  {llmAnalysis.careerPaths.map((p, i) => (
                    <div key={i} style={{ padding: 14, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}`, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: palette.textPrimary, fontSize: 14 }}>{p.role}</span>
                        <span style={{ fontSize: 13, color: palette.green, fontFamily: "'JetBrains Mono', monospace" }}>{p.estimatedSalary}</span>
                      </div>
                      <div style={{ fontSize: 12, color: palette.textDim, marginBottom: 4 }}>Timeframe: {p.timeframe}</div>
                      <div style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>{p.steps}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Negotiation Tips */}
              {llmAnalysis.negotiationTips && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.green, marginBottom: 10, letterSpacing: 0.5 }}>💬 NEGOTIATION TIPS</h4>
                  {llmAnalysis.negotiationTips.map((t, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: palette.inputBg, borderRadius: 8, marginBottom: 6, fontSize: 13, color: palette.textSecondary, lineHeight: 1.5, borderLeft: `3px solid ${palette.green}` }}>{t}</div>
                  ))}
                </div>
              )}

              {/* Action Plan */}
              {llmAnalysis.actionPlan && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.accent, marginBottom: 10, letterSpacing: 0.5 }}>📋 ACTION PLAN</h4>
                  {llmAnalysis.actionPlan.map((a, i) => (
                    <div key={i} style={{ padding: 14, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}`, marginBottom: 8, display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 90, padding: "4px 10px", background: `${palette.accent}22`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: palette.accent, textAlign: "center" }}>{a.timeframe}</div>
                      <div style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>{a.actions}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Feature A: Career Field Switcher ═══ */}
        <div className="fi fi5" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${palette.purple}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔀</div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Switch career fields</h3>
            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${palette.purple}22`, color: palette.purple, border: `1px solid ${palette.purple}44`, marginLeft: "auto" }}>Claude LLM</span>
          </div>
          <p style={{ fontSize: 13, color: palette.textSecondary, marginBottom: 14, lineHeight: 1.5 }}>Want to break into a different field? Select a target industry to see how your skills transfer, what bridge roles exist, and a concrete transition plan.</p>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <select value={targetField} onChange={e => setTargetField(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", background: palette.inputBg, border: `1px solid ${palette.inputBorder}`, borderRadius: 10, color: palette.textPrimary, fontSize: 14 }}>
              <option value="">Select target field...</option>
              {allGroups.filter(g => g !== matched.group).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button onClick={analyzeFieldSwitch} disabled={!targetField || switchLoading}
              style={{ padding: "10px 20px", background: (!targetField || switchLoading) ? palette.inputBorder : palette.purple, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: (!targetField || switchLoading) ? "not-allowed" : "pointer", minWidth: 140 }}>
              {switchLoading ? "Analyzing..." : "Analyze transition"}
            </button>
          </div>

          {switchAnalysis && (
            <div>
              {switchAnalysis.fallback && (
                <div style={{ padding: 10, background: `${palette.amber}11`, borderRadius: 8, marginBottom: 14, fontSize: 12, color: palette.amber }}>AI unavailable — showing salary-based analysis only</div>
              )}

              {/* Transferable Skills */}
              {switchAnalysis.transferableSkills?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.green, marginBottom: 8, letterSpacing: 0.5 }}>✓ TRANSFERABLE SKILLS</h4>
                  {switchAnalysis.transferableSkills.map((s, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: `${palette.green}11`, borderRadius: 8, marginBottom: 6, fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>
                      <strong style={{ color: palette.textPrimary }}>{s.skill}</strong>
                      {s.currentContext && <span> — Currently: {s.currentContext}</span>}
                      {s.targetContext && <span> → In {targetField}: {s.targetContext}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Skill Gaps */}
              {switchAnalysis.skillGaps?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.red, marginBottom: 8, letterSpacing: 0.5 }}>✗ SKILLS TO ACQUIRE</h4>
                  {switchAnalysis.skillGaps.map((g, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: `${palette.red}11`, borderRadius: 8, marginBottom: 6, fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>
                      <strong style={{ color: palette.textPrimary }}>{g.skill}</strong>
                      {g.importance && <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 11, marginLeft: 6, background: g.importance === "critical" ? `${palette.red}22` : `${palette.amber}22`, color: g.importance === "critical" ? palette.red : palette.amber }}>{g.importance}</span>}
                      {g.howToLearn && <div style={{ marginTop: 4, fontSize: 12, color: palette.textDim }}>→ {g.howToLearn}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Bridge Roles */}
              {switchAnalysis.bridgeRoles?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.purple, marginBottom: 8, letterSpacing: 0.5 }}>🌉 BRIDGE ROLES</h4>
                  {switchAnalysis.bridgeRoles.map((b, i) => (
                    <div key={i} style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}`, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: palette.textPrimary, fontSize: 14 }}>{b.role}</span>
                        <span style={{ fontSize: 13, color: palette.green, fontFamily: "'JetBrains Mono', monospace" }}>{b.salary}</span>
                      </div>
                      <div style={{ fontSize: 12, color: palette.textDim, marginBottom: 2 }}>{b.timeToReach && `Timeline: ${b.timeToReach}`}</div>
                      <div style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>{b.why}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Target Roles */}
              {switchAnalysis.realisticFirstRole && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 14, background: `${palette.accent}11`, borderRadius: 10, border: `1px solid ${palette.accent}33` }}>
                    <div style={{ fontSize: 11, color: palette.textDim, fontWeight: 600, marginBottom: 4 }}>REALISTIC FIRST ROLE</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: palette.textPrimary }}>{switchAnalysis.realisticFirstRole.title}</div>
                    <div style={{ fontSize: 14, color: palette.green }}>{switchAnalysis.realisticFirstRole.salary}</div>
                    <div style={{ fontSize: 12, color: palette.textDim }}>{switchAnalysis.realisticFirstRole.timeframe}</div>
                  </div>
                  {switchAnalysis.ultimateTarget && (
                    <div style={{ padding: 14, background: `${palette.purple}11`, borderRadius: 10, border: `1px solid ${palette.purple}33` }}>
                      <div style={{ fontSize: 11, color: palette.textDim, fontWeight: 600, marginBottom: 4 }}>3-5 YEAR TARGET</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: palette.textPrimary }}>{switchAnalysis.ultimateTarget.title}</div>
                      <div style={{ fontSize: 14, color: palette.green }}>{switchAnalysis.ultimateTarget.salary}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Transition Plan */}
              {switchAnalysis.transitionPlan?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.accent, marginBottom: 8, letterSpacing: 0.5 }}>📋 TRANSITION PLAN</h4>
                  {switchAnalysis.transitionPlan.map((p, i) => (
                    <div key={i} style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}`, marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 80, padding: "3px 8px", background: `${palette.accent}22`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: palette.accent, textAlign: "center" }}>{p.phase}</div>
                      <div style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>{p.actions}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risk + Salary Trajectory */}
              {(switchAnalysis.salaryTrajectory || switchAnalysis.riskAssessment) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {switchAnalysis.salaryTrajectory && (
                    <div style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: palette.green, marginBottom: 4 }}>💰 SALARY TRAJECTORY</div>
                      <div style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.5 }}>{switchAnalysis.salaryTrajectory}</div>
                    </div>
                  )}
                  {switchAnalysis.riskAssessment && (
                    <div style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: palette.amber, marginBottom: 4 }}>⚠️ RISK ASSESSMENT</div>
                      <div style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.5 }}>{switchAnalysis.riskAssessment}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Feature D: Find Higher-Paying Jobs ═══ */}
        <div className="fi fi5" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${palette.green}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔍</div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Find higher-paying jobs</h3>
            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${palette.green}22`, color: palette.green, border: `1px solid ${palette.green}44`, marginLeft: "auto" }}>Claude LLM</span>
          </div>
          <p style={{ fontSize: 13, color: palette.textSecondary, marginBottom: 14, lineHeight: 1.5 }}>Based on your resume and market data, get personalized job search recommendations with specific roles, companies, and search strategies.</p>

          <button onClick={searchHigherPayingJobs} disabled={jobSearchLoading}
            style={{ padding: "10px 20px", background: jobSearchLoading ? palette.inputBorder : palette.green, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: jobSearchLoading ? "not-allowed" : "pointer", marginBottom: 16 }}>
            {jobSearchLoading ? "Searching..." : "Find jobs paying more →"}
          </button>

          {jobSearchResults && (
            <div>
              {jobSearchResults.fallback && (
                <div style={{ padding: 10, background: `${palette.amber}11`, borderRadius: 8, marginBottom: 14, fontSize: 12, color: palette.amber }}>Using BLS data for job suggestions — connect API for personalized company recommendations</div>
              )}

              {/* Target Roles */}
              {jobSearchResults.targetRoles?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.accent, marginBottom: 8, letterSpacing: 0.5 }}>🎯 ROLES TO SEARCH FOR</h4>
                  {jobSearchResults.targetRoles.map((r, i) => (
                    <div key={i} style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}`, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: palette.textPrimary, fontSize: 14 }}>{r.title}</span>
                        <span style={{ fontSize: 13, color: palette.green, fontFamily: "'JetBrains Mono', monospace" }}>{r.salaryRange}</span>
                      </div>
                      <div style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.5, marginBottom: 6 }}>{r.whyGoodFit}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <a href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(r.searchQuery || r.title)}&location=${encodeURIComponent(formData.location.split(",")[0])}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${palette.accent}22`, color: palette.accent, textDecoration: "none" }}>Search LinkedIn</a>
                        <a href={`https://www.indeed.com/jobs?q=${encodeURIComponent(r.searchQuery || r.title)}&l=${encodeURIComponent(formData.location)}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${palette.purple}22`, color: palette.purple, textDecoration: "none" }}>Search Indeed</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Companies */}
              {jobSearchResults.topCompanies?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.purple, marginBottom: 8, letterSpacing: 0.5 }}>🏢 COMPANIES TO TARGET</h4>
                  {jobSearchResults.topCompanies.map((c, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: `${palette.purple}11`, borderRadius: 8, marginBottom: 6, fontSize: 13, color: palette.textSecondary, lineHeight: 1.5 }}>
                      <strong style={{ color: palette.textPrimary }}>{c.name}</strong> — {c.whyGoodFit} <span style={{ color: palette.green }}>{c.typicalSalary}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Job Boards */}
              {jobSearchResults.jobBoards?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.amber, marginBottom: 8, letterSpacing: 0.5 }}>📋 WHERE TO SEARCH</h4>
                  {jobSearchResults.jobBoards.map((b, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: palette.inputBg, borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ color: palette.textPrimary, fontSize: 13 }}>{b.name}</strong>
                        <div style={{ fontSize: 12, color: palette.textDim }}>{b.searchTip}</div>
                      </div>
                      <a href={b.url} target="_blank" rel="noopener noreferrer"
                        style={{ padding: "4px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: palette.accent, color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>Open</a>
                    </div>
                  ))}
                </div>
              )}

              {/* Strategy + Leverage */}
              {(jobSearchResults.searchStrategy || jobSearchResults.salaryNegotiationLeverage) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {jobSearchResults.searchStrategy && (
                    <div style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: palette.accent, marginBottom: 4 }}>📊 SEARCH STRATEGY</div>
                      <div style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.5 }}>{jobSearchResults.searchStrategy}</div>
                    </div>
                  )}
                  {jobSearchResults.salaryNegotiationLeverage && (
                    <div style={{ padding: 12, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: palette.green, marginBottom: 4 }}>💪 YOUR LEVERAGE</div>
                      <div style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.5 }}>{jobSearchResults.salaryNegotiationLeverage}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Feature B: AI Resume Rewriter ═══ */}
        <div className="fi fi6" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${palette.amber}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✍️</div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>AI resume rewriter</h3>
            <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${palette.accent}22`, color: palette.accent, border: `1px solid ${palette.accent}44`, marginLeft: "auto" }}>Claude LLM</span>
          </div>

          {/* Job Description Input */}
          <div style={{ marginBottom: 16, padding: 14, background: palette.inputBg, borderRadius: 10, border: `1px solid ${palette.inputBorder}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: palette.textSecondary, marginBottom: 8 }}>TARGET A SPECIFIC JOB (optional — makes resume rewriting much more targeted)</div>
            <textarea
              placeholder="Paste the job description here... The AI will rewrite your resume specifically for this role, matching the exact requirements, skills, and keywords from the posting."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "10px 14px", background: palette.bg, border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.textPrimary, fontSize: 13, resize: "vertical", lineHeight: 1.5, marginBottom: 8 }}
            />
            <input
              type="text"
              placeholder="Job posting URL (optional — for reference)"
              value={jobUrl}
              onChange={e => setJobUrl(e.target.value)}
              style={{ width: "100%", padding: "8px 14px", background: palette.bg, border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.textPrimary, fontSize: 13 }}
            />
            {jobDescription && <div style={{ fontSize: 11, color: palette.green, marginTop: 6 }}>Job description loaded ({jobDescription.length} chars) — resume will be tailored to this specific role</div>}
          </div>
          <p style={{ fontSize: 13, color: palette.textSecondary, marginBottom: 14, lineHeight: 1.5 }}>
            {formData.resumeText.length > 30
              ? `Get your resume rewritten with stronger action verbs, metrics, and ATS-optimized keywords targeting ${matched.title} at $${Math.max(results.adjPct75, Math.round(salary * 1.2), results.adjPct90).toLocaleString()}/year.`
              : "Go back and paste your resume text to get AI-powered bullet-point rewrites with metrics, action verbs, and ATS optimization."
            }
          </p>

          {formData.resumeText.length > 30 && (
            <button onClick={rewriteResume} disabled={rewriteLoading}
              style={{ padding: "10px 20px", background: rewriteLoading ? palette.inputBorder : `linear-gradient(135deg, ${palette.amber}, ${palette.accent})`, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: rewriteLoading ? "not-allowed" : "pointer", marginBottom: 16 }}>
              {rewriteLoading ? "Rewriting your resume..." : "Rewrite my resume →"}
            </button>
          )}

          {resumeRewrite && (
            <div>
              {resumeRewrite.fallback && (
                <div style={{ padding: 10, background: `${palette.amber}11`, borderRadius: 8, marginBottom: 14, fontSize: 12, color: palette.amber }}>Using rule-based rewriting engine (pattern matching + verb upgrades + ATS keyword analysis)</div>
              )}

              {/* Top Tip */}
              {resumeRewrite.topTip && (
                <div style={{ padding: 14, background: `${palette.accent}11`, borderRadius: 10, border: `1px solid ${palette.accent}33`, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: palette.accent, marginBottom: 4 }}>💡 TOP TIP</div>
                  <p style={{ fontSize: 13, color: palette.textPrimary, lineHeight: 1.6 }}>{resumeRewrite.topTip}</p>
                </div>
              )}

              {/* Score Before/After */}
              {resumeRewrite.overallScore && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, justifyContent: "center" }}>
                  <div style={{ textAlign: "center", padding: "12px 20px", background: palette.inputBg, borderRadius: 10, minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: palette.textDim }}>Current score</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: resumeRewrite.overallScore < 50 ? palette.red : resumeRewrite.overallScore < 70 ? palette.amber : palette.green }}>{resumeRewrite.overallScore}</div>
                    <div style={{ fontSize: 11, color: palette.textDim }}>/ 100</div>
                  </div>
                  <div style={{ fontSize: 22, color: palette.textDim }}>→</div>
                  <div style={{ textAlign: "center", padding: "12px 20px", background: palette.inputBg, borderRadius: 10, minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: palette.textDim }}>After rewrites</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: palette.green }}>{resumeRewrite.improvedScore}</div>
                    <div style={{ fontSize: 11, color: palette.textDim }}>/ 100</div>
                  </div>
                </div>
              )}

              {/* New Professional Summary */}
              {resumeRewrite.newSummary && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.green, marginBottom: 8, letterSpacing: 0.5 }}>✓ REWRITTEN PROFESSIONAL SUMMARY</h4>
                  <div style={{ padding: 14, background: `${palette.green}11`, borderRadius: 10, border: `1px solid ${palette.green}33`, fontSize: 13, color: palette.textPrimary, lineHeight: 1.7 }}>{resumeRewrite.newSummary}</div>
                </div>
              )}

              {/* Before/After Rewrites */}
              {resumeRewrite.rewrites?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.amber, marginBottom: 8, letterSpacing: 0.5 }}>📝 BULLET-BY-BULLET REWRITES</h4>
                  {resumeRewrite.rewrites.map((r, i) => (
                    <div key={i} style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", border: `1px solid ${palette.inputBorder}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                        <div style={{ padding: 12, background: `${palette.red}08`, borderRight: `1px solid ${palette.inputBorder}` }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: palette.red, marginBottom: 6 }}>BEFORE</div>
                          <div style={{ fontSize: 12, color: palette.textSecondary, lineHeight: 1.5, textDecoration: "line-through", opacity: 0.7 }}>{r.original}</div>
                        </div>
                        <div style={{ padding: 12, background: `${palette.green}08` }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: palette.green, marginBottom: 6 }}>AFTER</div>
                          <div style={{ fontSize: 12, color: palette.textPrimary, lineHeight: 1.5 }}>{r.improved}</div>
                        </div>
                      </div>
                      {(r.issues?.length > 0 || r.explanation) && (
                        <div style={{ padding: "8px 12px", background: palette.inputBg, borderTop: `1px solid ${palette.inputBorder}` }}>
                          {r.issues?.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: r.explanation ? 4 : 0 }}>
                              {r.issues.map((issue, j) => (
                                <span key={j} style={{ padding: "1px 8px", borderRadius: 10, fontSize: 11, background: `${palette.amber}22`, color: palette.amber }}>{issue}</span>
                              ))}
                            </div>
                          )}
                          {r.explanation && <div style={{ fontSize: 12, color: palette.textDim, lineHeight: 1.4 }}>{r.explanation}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ATS Keywords */}
              {(resumeRewrite.atsKeywords?.length > 0 || resumeRewrite.missingKeywords?.length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {resumeRewrite.atsKeywords?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.green, marginBottom: 8, letterSpacing: 0.5 }}>✓ ATS KEYWORDS FOUND</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {resumeRewrite.atsKeywords.map((k, i) => (
                          <span key={i} style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, background: `${palette.green}22`, color: palette.green }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {resumeRewrite.missingKeywords?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: palette.red, marginBottom: 8, letterSpacing: 0.5 }}>✗ MISSING KEYWORDS TO ADD</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {resumeRewrite.missingKeywords.map((k, i) => (
                          <span key={i} style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, background: `${palette.red}22`, color: palette.red }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Download / Print improved resume */}
              {resumeRewrite.rewrites?.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${palette.inputBorder}` }}>
                  <button onClick={() => {
                    const rt = formData.resumeText;
                    // Extract real info from resume
                    const name = rt.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/m)?.[1] || "Your Name";
                    const email = rt.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] || "";
                    const phone = rt.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] || "";
                    const linkedin = rt.match(/linkedin\.com\/in\/[\w-]+/)?.[0] || "";
                    const location = rt.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})/)?.[1] || formData.location;
                    const contactParts = [email, phone, linkedin ? `linkedin.com/in/${linkedin.split('/in/')[1]}` : "", location].filter(Boolean);
                    // Extract education from original resume
                    const eduMatch = rt.match(/(?:education|academic|university|college|degree|bachelor|master|m\.s\.|b\.s\.|b\.a\.).*$/im);
                    const eduSection = [];
                    if (eduMatch) {
                      const eduStart = rt.indexOf(eduMatch[0]);
                      const eduText = rt.substring(eduStart, eduStart + 500).split('\n').filter(l => l.trim().length > 5).slice(0, 6);
                      eduSection.push(...eduText);
                    }
                    // Extract skills from original resume
                    const skillsMatch = rt.match(/(?:skills|technical skills|core competencies|technologies)[:\s]*(.*?)(?:\n\n|\n[A-Z])/is);
                    const skillsText = skillsMatch?.[1]?.trim() || "";
                    const rw = resumeRewrite;
                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resume - ${name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Source Sans 3','Helvetica Neue',Arial,sans-serif;max-width:8.5in;margin:0 auto;padding:0.5in 0.6in;color:#222;line-height:1.45;font-size:11pt}
h1{font-size:20pt;font-weight:700;color:#111;margin-bottom:2px;letter-spacing:0.5px}
.contact{font-size:9pt;color:#444;margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid #222}
.contact a{color:#444;text-decoration:none}
.stitle{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#111;border-bottom:1px solid #999;padding-bottom:3px;margin:14px 0 6px}
.summary{font-size:10pt;color:#333;margin-bottom:8px}
ul{padding-left:16px;margin-bottom:6px}
li{font-size:10pt;margin-bottom:4px;color:#222}
.edit{background:#fffde7;border:1px dashed #f9a825;padding:1px 4px;border-radius:3px;font-weight:600;cursor:text;min-width:30px;display:inline-block}
.edu-item{font-size:10pt;margin-bottom:3px}
.edu-item strong{font-weight:600}
.skills{font-size:9.5pt;color:#333}
.toolbar{position:fixed;top:0;left:0;right:0;background:#1a1a2e;color:#fff;padding:8px 20px;display:flex;align-items:center;gap:16px;font-size:13px;font-family:system-ui;z-index:999}
.toolbar button{background:#4CAF50;color:#fff;border:none;padding:6px 18px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
.toolbar button:hover{background:#43A047}
.toolbar .hint{color:#aaa;font-size:11px;margin-left:auto}
@media print{.toolbar{display:none !important}body{padding:0.4in 0.5in}}
[contenteditable]:focus{outline:2px solid #4CAF50;outline-offset:1px;border-radius:2px}
[contenteditable]:hover{background:#f5f5f5}
</style></head><body>
<div class="toolbar">
  <span style="font-weight:600">Editable Resume</span>
  <button onclick="window.print()">Print / Save as PDF</button>
  <span class="hint">Click any text to edit it directly. Yellow highlights = fill in your numbers. Then print.</span>
</div>
<div style="margin-top:44px" contenteditable="true">
<h1>${name}</h1>
<div class="contact">${contactParts.length > 0 ? contactParts.join(' | ') : 'your.email@example.com | (555) 123-4567 | linkedin.com/in/yourname | City, State'}</div>

<div class="stitle">Professional Summary</div>
<div class="summary">${rw.newSummary || `Results-driven ${formData.jobTitle} with proven expertise in delivering measurable business outcomes.`}</div>

<div class="stitle">Professional Experience</div>
<ul>
${rw.rewrites.map(r => `<li>${r.improved.replace(/\[([^\]]+)\]/g, '<span class="edit" title="Click to edit — replace with your actual number">$1</span>')}</li>`).join('\n')}
</ul>

${eduSection.length > 0 ? `<div class="stitle">Education</div>
${eduSection.map(l => `<div class="edu-item">${l.trim()}</div>`).join('\n')}` : `<div class="stitle">Education</div>
<div class="edu-item"><strong>Your Degree</strong> — University Name, Year</div>`}

${skillsText ? `<div class="stitle">Technical Skills</div>
<div class="skills">${skillsText}</div>` : rw.atsKeywords?.length ? `<div class="stitle">Technical Skills</div>
<div class="skills">${[...(rw.atsKeywords||[])].join(', ')}${rw.missingKeywords?.length ? ', ' + rw.missingKeywords.slice(0,5).join(', ') : ''}</div>` : ''}
</div>
</body></html>`;
                    const blob = new Blob([html], { type: "text/html" });
                    window.open(URL.createObjectURL(blob), "_blank");
                  }}
                    style={{ width: "100%", padding: "12px 20px", background: `linear-gradient(135deg, ${palette.green}, ${palette.accent})`, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    Download editable resume →
                  </button>
                  <p style={{ fontSize: 11, color: palette.textDim, marginTop: 6, textAlign: "center" }}>Opens editable resume in new tab — click any text to edit, yellow highlights = fill in your numbers, then Print / Save as PDF</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data source footer */}
        <div className="fi fi6" style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 14, padding: "18px 22px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 15, marginTop: 1 }}>📊</span>
            <div>
              <p style={{ fontSize: 13, color: palette.textSecondary, lineHeight: 1.6, marginBottom: 4 }}>
                <strong style={{ color: palette.textPrimary }}>Data Source:</strong> U.S. Bureau of Labor Statistics — Occupational Employment and Wage Statistics (OEWS)
              </p>
              <p style={{ fontSize: 12, color: palette.textDim, lineHeight: 1.5, marginBottom: 8 }}>
                National salary percentile estimates (10th–90th) • 259 occupations across 22 industry groups • Location adjustments use cost-of-living indices for {Object.keys(LOCATION_MULTIPLIERS).length} metro areas • Resume analysis powered by Claude (Anthropic)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <a href="https://www.bls.gov/oes/tables.htm" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>📥 BLS OEWS Data Tables</a>
                <a href="https://www.bls.gov/oes/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>📋 OEWS Program</a>
                <a href="https://www.bls.gov/ooh/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>📖 Occupational Outlook</a>
                <a href="https://www.bls.gov/oes/current/oes_stru.htm" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: palette.accent, textDecoration: "none" }}>🔍 Occupation Search</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

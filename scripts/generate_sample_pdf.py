import os

pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 480 >>
stream
BT
/F1 16 Tf
50 720 Td
(INNOVATION SPECIFICATION: NANO-CARBON FIBER) Tj
/F1 10 Tf
0 -30 Td
(Category: New Materials | TRL Level: 6 Prototype Ready) Tj
0 -25 Td
(Summary: High strength nanocomposite carbon polymer with 450C heat resistance.) Tj
0 -20 Td
(Application: Aerospace and industrial high-temperature airframes.) Tj
0 -25 Td
(Total Budget: 2600000 RUB. Duration: 7 months.) Tj
0 -25 Td
(Milestone 1: Patent research and matrix synthesis - 800000 RUB) Tj
0 -20 Td
(Milestone 2: Prototype autoclave molding and tensile tests - 1100000 RUB) Tj
0 -20 Td
(Milestone 3: Industrial pilot batch and certification protocols - 700000 RUB) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000760 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
831
%%EOF"""

out_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "sample_project_spec.pdf")
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "wb") as f:
    f.write(pdf_content)

print(f"Sample PDF created at: {out_path} ({len(pdf_content)} bytes)")

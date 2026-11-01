
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Edukrate <legal@noteswallah.co.in>",
      to: email,
      subject: "Welcome to Edukrate 🚀",
      html: `
        <div
          style="
            background:#f5f5f5;
            padding:40px 20px;
            font-family:Arial,sans-serif;
          "
        >
          <div
            style="
              max-width:600px;
              margin:auto;
              background:white;
              border-radius:18px;
              overflow:hidden;
              border:1px solid #e5e5e5;
            "
          >
            <div
              style="
                background:#dc2626;
                padding:32px;
                text-align:center;
                color:white;
              "
            >
              <img
                src="https://edukrate.in/edukratelogo.png"
                alt="Edukrate"
                width="80"
                style="margin-bottom:16px;"
              />

              <h1 style="margin:0;font-size:32px;">
                Edukrate
              </h1>

              <p style="margin-top:10px;font-size:16px;opacity:0.9;">
                Learn. Organize. Grow.
              </p>
            </div>

            <div style="padding:40px 32px;color:#111;">
              <h2 style="margin-top:0;font-size:28px;">
                Welcome, ${name || "Student"} 👋
              </h2>

              <p style="font-size:16px;line-height:1.7;color:#444;">
                Your Edukrate account has been successfully created.
              </p>

              <p style="font-size:16px;line-height:1.7;color:#444;">
                You can now upload notes, download PDFs, save useful study material,
                and connect with student creators across the platform.
              </p>

              <div
                style="
                  background:#fafafa;
                  border:1px solid #eee;
                  border-radius:14px;
                  padding:20px;
                  margin-top:30px;
                "
              >
                <p style="margin:0 0 12px 0;font-weight:bold;">
                  What you can do:
                </p>

                <ul style="padding-left:18px;color:#444;line-height:2;">
                  <li>Upload and share study notes</li>
                  <li>Download verified PDFs</li>
                  <li>Save notes for later</li>
                  <li>Follow contributors and creators</li>
                </ul>
              </div>

              <div style="text-align:center;margin-top:35px;">
                <a
                  href="https://edukrate.in"
                  style="
                    display:inline-block;
                    background:#dc2626;
                    color:white;
                    text-decoration:none;
                    padding:14px 28px;
                    border-radius:12px;
                    font-weight:bold;
                    font-size:15px;
                  "
                >
                  Open Edukrate
                </a>
              </div>

              <p
                style="
                  margin-top:40px;
                  font-size:14px;
                  color:#777;
                  line-height:1.8;
                "
              >
                Thank you for being part of the Edukrate community.
                <br />
                Team Edukrate
              </p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome email error:", error);

    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

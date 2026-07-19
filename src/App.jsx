import { useState } from "react";
import "./App.css";

function getMacTypes(oui) {
  const firstOctet = Number.parseInt(oui.slice(0, 2), 16);

  if (Number.isNaN(firstOctet)) {
    return ["Unknown", "Unknown"];
  }

  return [
    firstOctet & 1 ? "Multicast" : "Unicast",
    firstOctet & 2
      ? "Locally Administered"
      : "Universally Administered",
  ];
}

function App() {
  const [oui, setOui] = useState("A4:83:E7");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const hex = event.target.value
      .replace(/[^a-f0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase();

    setOui(hex.match(/.{1,2}/g)?.join(":") || "");
    setData(null);
    setError("");
  }

  async function lookupOUI() {
    const normalizedOUI = oui.replaceAll(":", "");

    if (!/^[0-9A-F]{6}$/.test(normalizedOUI)) {
      setError("Enter a valid OUI.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(
        `/api/mac/${encodeURIComponent(oui)}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("The server returned an invalid response.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Lookup failed.");
      }

      setData(result);
    } catch (error) {
      setError(error.message || "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  const [transmissionType, administrationType] = getMacTypes(oui);

  const rows = [
    ["Transmission Type", transmissionType],
    ["Administration Type", administrationType],
    ...(data
      ? [
          ["Company", data.company],
          ["Country", data.country],
          ["Address", data.address],
          ["Block Type", data.blockType],
          ["Block Start", data.blockStart],
          ["Block Size", data.blockSize],
          ["Last Updated", data.updated],
          ["Randomized MAC", data.isRand ? "Yes" : "No"],
          ["Private", data.isPrivate ? "Yes" : "No"],
        ]
      : []),
  ];

  return (
    <section className="card">
      <h1>OUI Vendor Lookup</h1>

      <div className="search-box">
        <input
          value={oui}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !loading) {
              lookupOUI();
            }
          }}
          maxLength={8}
          autoComplete="off"
          spellCheck={false}
          aria-label="OUI"
          disabled={loading}
        />

        <button
          type="button"
          onClick={lookupOUI}
          disabled={loading}
          aria-label="Search"
        >
          {loading ? "..." : <img src="/search.svg" alt="" />}
        </button>
      </div>

      {(data || error) && (
        <div className="result">
          {error && <p className="error">{error}</p>}

          {data &&
            rows.map(([label, value]) => (
              <div className="result-row" key={label}>
                <span>{label}</span>
                <strong>{value ?? "N/A"}</strong>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

export default App;
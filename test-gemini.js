const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6JlhP6RY8Higbj6Z6Voy-CU-bVMSNhNz0L86GRD91BKlQ"; // 👈 Swap with your real key
const payload = { contents: [{ parts: [{ text: "say hello" }] }] };

fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
})
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error("Network Error:", err));

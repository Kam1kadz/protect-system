package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	apiKey  string
	from    string
	appName string
	siteURL string
}

func New(apiKey, from, appName, siteURL string) *Client {
	return &Client{apiKey: apiKey, from: from, appName: appName, siteURL: siteURL}
}

func (c *Client) SendPasswordReset(toEmail, token string) error {
	if c.apiKey == "" {
		return nil // email не настроен, молча пропускаем
	}

	resetURL := fmt.Sprintf("%s/auth/reset-password?token=%s&email=%s", c.siteURL, token, toEmail)

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:#111113;border:1px solid #1c1c1f;border-radius:16px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;">Reset your password</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 24px;">We received a request to reset the password for your <strong>%s</strong> account.</p>
    <a href="%s" style="display:inline-block;background:#22c55e;color:#000;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a>
    <p style="color:#52525b;font-size:12px;margin:24px 0 0;">Or copy this link: <span style="color:#a1a1aa;">%s</span></p>
    <p style="color:#52525b;font-size:12px;margin:12px 0 0;">This link expires in 1 hour. If you didn&#39;t request this, ignore this email.</p>
  </div>
</body>
</html>`, c.appName, resetURL, resetURL)

	body := map[string]any{
		"from":    c.from,
		"to":      []string{toEmail},
		"subject": fmt.Sprintf("[%s] Reset your password", c.appName),
		"html":    html,
	}

	payload, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend error %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

import { Request, Response } from "express";

export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      res.status(400).json({ error: "Name, email, and message are required" });
      return;
    }

    // Per user instructions, we do not create a new collection for this.
    // We mock the successful submission of the contact form.
    console.log(`[Contact] Message received from ${name} (${email}): ${message}`);

    res.status(200).json({ success: true, message: "Contact message received successfully" });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

import { expect, test } from "@playwright/test";


test("sharing, password protection, permissions, and persistence", async ({
    browser,
}) => {
    const marker = `persistent-${Date.now()}`;
    const visitorMarker = `visitor-${Date.now()}`;
    const password = "test-password";

    const ownerContext = await browser.newContext();
    const owner = await ownerContext.newPage();

    await owner.goto("/");
    await expect(owner).toHaveURL(/\/[^/]+$/);

    const boardUrl = owner.url();
    const ownerEditor = owner.locator(".ProseMirror");

    await ownerEditor.fill(marker);
    await expect(
        owner.getByText("Saving...", { exact: true }),
    ).toBeVisible();
    await expect(
        owner.getByText("✓ Saved", { exact: true }),
    ).toBeVisible();

    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await visitor.goto(boardUrl);

    const visitorEditor = visitor.locator(".ProseMirror");
    await expect(visitorEditor).toContainText(marker);
    await expect(
        visitor.getByRole("button", { name: "Protect" }),
    ).toHaveCount(0);

    await owner.getByLabel("Allow Editing").click();
    await expect(owner.getByLabel("Allow Editing")).not.toBeChecked();

    await expect(visitorEditor).toHaveAttribute(
        "contenteditable",
        "false",
        {
            timeout: 5_000,
        },
    );
    await expect(visitorEditor).toContainText(marker);

    await ownerEditor.fill(`${marker}-locked`);
    await owner.getByRole("button", { name: "Protect" }).click();
    await owner.getByPlaceholder("Password", {
        exact: true,
    }).fill(password);
    await owner.getByPlaceholder("Confirm Password").fill(password);
    await owner.getByRole("button", { name: "Lock Board" }).click();

    await expect(
        owner.getByRole("button", { name: "Change Password" }),
    ).toBeVisible();

    await owner.reload();
    await expect(owner.getByText("Password Protected")).toBeVisible();
    await expect(owner.locator(".ProseMirror")).toHaveCount(0);

    await owner.getByLabel("Board password").fill("wrong-password");
    await owner.getByRole("button", { name: "Unlock" }).click();
    await expect(owner.getByRole("alert")).toHaveText(
        "Incorrect password",
    );

    await owner.getByLabel("Board password").fill(password);
    await owner.getByRole("button", { name: "Unlock" }).click();
    await expect(owner.locator(".ProseMirror")).toContainText(
        `${marker}-locked`,
    );
    await expect(owner.locator(".ProseMirror")).toHaveAttribute(
        "contenteditable",
        "true",
    );

    const freshVisitorContext = await browser.newContext();
    const freshVisitor = await freshVisitorContext.newPage();
    await freshVisitor.goto(boardUrl);
    await expect(
        freshVisitor.getByText("Password Protected"),
    ).toBeVisible();

    await freshVisitor.getByLabel("Board password").fill(password);
    await freshVisitor.getByRole("button", { name: "Unlock" }).click();
    await expect(freshVisitor.locator(".ProseMirror")).toContainText(
        `${marker}-locked`,
    );
    await expect(freshVisitor.locator(".ProseMirror")).toHaveAttribute(
        "contenteditable",
        "false",
    );

    await owner.getByLabel("Allow Editing").click();
    await expect(owner.getByLabel("Allow Editing")).toBeChecked();
    await freshVisitor.reload();
    await expect(
        freshVisitor.getByText("Password Protected"),
    ).toBeVisible();
    await freshVisitor.getByLabel("Board password").fill(password);
    await freshVisitor.getByRole("button", { name: "Unlock" }).click();
    await expect(freshVisitor.locator(".ProseMirror")).toHaveAttribute(
        "contenteditable",
        "true",
    );

    await freshVisitor.locator(".ProseMirror").fill(visitorMarker);
    await expect(
        freshVisitor.getByText("Saving...", { exact: true }),
    ).toBeVisible();
    await expect(
        freshVisitor.getByText("✓ Saved", { exact: true }),
    ).toBeVisible();
    await expect(owner.locator(".ProseMirror")).toContainText(
        visitorMarker,
        {
            timeout: 5_000,
        },
    );

    await freshVisitorContext.close();
    await visitorContext.close();
    await ownerContext.close();
});

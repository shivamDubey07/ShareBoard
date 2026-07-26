import os
import tempfile
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.routers.boards import (
    change_permission,
    load_board,
    lock,
    new_board,
    save_board,
    verify,
)
from app.schemas import (
    BoardCreate,
    BoardUpdate,
    LockBoardRequest,
    PermissionUpdate,
    VerifyPasswordRequest,
)


class BoardFlowTests(unittest.TestCase):
    def setUp(self):
        os.environ["SESSION_SECRET"] = "test-secret"
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = os.path.join(
            self.temp_dir.name,
            "shareboard-test.db",
        )
        self.engine = create_engine(
            f"sqlite:///{self.database_path}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        created = new_board(
            BoardCreate(slug="shared-board"),
            db=self.db,
        )
        self.slug = created["slug"]
        self.owner_token = created["owner_token"]

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        self.temp_dir.cleanup()

    def owner_save(self, content, version):
        return save_board(
            self.slug,
            BoardUpdate(content=content, version=version),
            owner_token=self.owner_token,
            access_token=None,
            db=self.db,
        )

    def test_share_link_reads_saved_content_without_secrets(self):
        saved = self.owner_save("<p>shared forever</p>", 0)

        visitor_view = load_board(
            self.slug,
            owner_token=None,
            access_token=None,
            db=self.db,
        )

        self.assertEqual(
            visitor_view["content"],
            "<p>shared forever</p>",
        )
        self.assertEqual(visitor_view["version"], 1)
        self.assertFalse(visitor_view["is_owner"])

        for response in (saved, visitor_view):
            self.assertNotIn("owner_token", response)
            self.assertNotIn("password_hash", response)

        with self.assertRaises(HTTPException) as conflict:
            new_board(
                BoardCreate(slug=self.slug),
                db=self.db,
            )

        self.assertEqual(conflict.exception.status_code, 409)

    def test_protected_board_prompts_owner_and_visitor(self):
        saved = self.owner_save("<p>protected content</p>", 0)
        locked = lock(
            self.slug,
            LockBoardRequest(password="correct-password"),
            owner_token=self.owner_token,
            db=self.db,
        )

        owner_reload = load_board(
            self.slug,
            owner_token=self.owner_token,
            access_token=None,
            db=self.db,
        )
        visitor_reload = load_board(
            self.slug,
            owner_token=None,
            access_token=None,
            db=self.db,
        )

        self.assertTrue(owner_reload["locked"])
        self.assertTrue(visitor_reload["locked"])
        self.assertNotIn("content", owner_reload)
        self.assertNotIn("content", visitor_reload)

        with self.assertRaises(HTTPException) as incorrect:
            verify(
                self.slug,
                VerifyPasswordRequest(password="wrong"),
                owner_token=None,
                db=self.db,
            )

        self.assertEqual(incorrect.exception.status_code, 401)

        visitor_unlock = verify(
            self.slug,
            VerifyPasswordRequest(
                password="correct-password",
            ),
            owner_token=None,
            db=self.db,
        )
        owner_unlock = verify(
            self.slug,
            VerifyPasswordRequest(
                password="correct-password",
            ),
            owner_token=self.owner_token,
            db=self.db,
        )

        self.assertEqual(
            visitor_unlock["content"],
            "<p>protected content</p>",
        )
        self.assertEqual(visitor_unlock["version"], saved["version"])
        self.assertFalse(visitor_unlock["is_owner"])
        self.assertTrue(owner_unlock["is_owner"])

        unlocked_view = load_board(
            self.slug,
            owner_token=None,
            access_token=visitor_unlock["access_token"],
            db=self.db,
        )
        self.assertEqual(
            unlocked_view["content"],
            "<p>protected content</p>",
        )
        self.assertEqual(
            locked["access_token"],
            owner_unlock["access_token"],
        )

    def test_allow_editing_is_enforced_by_the_api(self):
        read_only = change_permission(
            self.slug,
            PermissionUpdate(can_edit=False),
            owner_token=self.owner_token,
            db=self.db,
        )
        self.assertFalse(read_only["can_edit"])

        with self.assertRaises(HTTPException) as forbidden:
            save_board(
                self.slug,
                BoardUpdate(
                    content="<p>visitor overwrite</p>",
                    version=0,
                ),
                owner_token=None,
                access_token=None,
                db=self.db,
            )

        self.assertEqual(forbidden.exception.status_code, 403)

        owner_saved = self.owner_save(
            "<p>owner edit</p>",
            0,
        )
        self.assertEqual(owner_saved["version"], 1)

        change_permission(
            self.slug,
            PermissionUpdate(can_edit=True),
            owner_token=self.owner_token,
            db=self.db,
        )

        visitor_saved = save_board(
            self.slug,
            BoardUpdate(
                content="<p>visitor edit</p>",
                version=1,
            ),
            owner_token=None,
            access_token=None,
            db=self.db,
        )
        self.assertEqual(
            visitor_saved["content"],
            "<p>visitor edit</p>",
        )

    def test_protected_writes_require_password_and_permission(self):
        lock(
            self.slug,
            LockBoardRequest(password="board-password"),
            owner_token=self.owner_token,
            db=self.db,
        )

        with self.assertRaises(HTTPException) as password_required:
            save_board(
                self.slug,
                BoardUpdate(content="blocked", version=0),
                owner_token=self.owner_token,
                access_token=None,
                db=self.db,
            )

        self.assertEqual(
            password_required.exception.status_code,
            403,
        )

        visitor = verify(
            self.slug,
            VerifyPasswordRequest(password="board-password"),
            owner_token=None,
            db=self.db,
        )

        visitor_saved = save_board(
            self.slug,
            BoardUpdate(
                content="verified visitor content",
                version=0,
            ),
            owner_token=None,
            access_token=visitor["access_token"],
            db=self.db,
        )
        self.assertEqual(visitor_saved["version"], 1)

        change_permission(
            self.slug,
            PermissionUpdate(can_edit=False),
            owner_token=self.owner_token,
            db=self.db,
        )

        with self.assertRaises(HTTPException) as read_only:
            save_board(
                self.slug,
                BoardUpdate(content="blocked", version=1),
                owner_token=None,
                access_token=visitor["access_token"],
                db=self.db,
            )

        self.assertEqual(read_only.exception.status_code, 403)

        owner = verify(
            self.slug,
            VerifyPasswordRequest(password="board-password"),
            owner_token=self.owner_token,
            db=self.db,
        )
        saved = save_board(
            self.slug,
            BoardUpdate(content="owner content", version=1),
            owner_token=self.owner_token,
            access_token=owner["access_token"],
            db=self.db,
        )
        self.assertEqual(saved["content"], "owner content")

    def test_stale_save_and_old_password_cannot_overwrite(self):
        first_save = self.owner_save("newest content", 0)

        with self.assertRaises(HTTPException) as stale:
            self.owner_save("stale empty content", 0)

        self.assertEqual(stale.exception.status_code, 409)

        first_lock = lock(
            self.slug,
            LockBoardRequest(password="first-password"),
            owner_token=self.owner_token,
            db=self.db,
        )
        lock(
            self.slug,
            LockBoardRequest(password="second-password"),
            owner_token=self.owner_token,
            db=self.db,
        )

        old_access = load_board(
            self.slug,
            owner_token=None,
            access_token=first_lock["access_token"],
            db=self.db,
        )
        self.assertTrue(old_access["locked"])

        with self.assertRaises(HTTPException) as old_password:
            verify(
                self.slug,
                VerifyPasswordRequest(
                    password="first-password",
                ),
                owner_token=None,
                db=self.db,
            )

        self.assertEqual(old_password.exception.status_code, 401)
        self.assertEqual(first_save["version"], 1)

    def test_content_survives_database_reconnect(self):
        self.owner_save("<p>restart marker</p>", 0)
        self.db.close()
        self.engine.dispose()

        restarted_engine = create_engine(
            f"sqlite:///{self.database_path}",
            connect_args={"check_same_thread": False},
        )
        RestartedSession = sessionmaker(bind=restarted_engine)
        restarted_db = RestartedSession()

        try:
            board = load_board(
                self.slug,
                owner_token=None,
                access_token=None,
                db=restarted_db,
            )
            self.assertEqual(
                board["content"],
                "<p>restart marker</p>",
            )
            self.assertEqual(board["version"], 1)
        finally:
            restarted_db.close()
            restarted_engine.dispose()

        self.db = self.Session()


if __name__ == "__main__":
    unittest.main()

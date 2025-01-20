use dashmap::{mapref::one::RefMut, DashMap, Entry};

use super::{
  error::{Error, Result},
  storage::SqliteDocStorage,
};

#[derive(Default)]
pub struct SqliteDocStoragePool {
  inner: DashMap<String, SqliteDocStorage>,
}

impl SqliteDocStoragePool {
  fn get_or_create_storage<'a>(
    &'a self,
    universal_id: String,
    path: &str,
  ) -> RefMut<'a, String, SqliteDocStorage> {
    let entry = self.inner.entry(universal_id);
    if let Entry::Occupied(storage) = entry {
      return storage.into_ref();
    }
    let storage = SqliteDocStorage::new(path.to_string());

    entry.or_insert(storage)
  }

  pub fn ensure_storage<'a>(
    &'a self,
    universal_id: String,
  ) -> Result<RefMut<'a, String, SqliteDocStorage>> {
    let entry = self.inner.entry(universal_id);

    if let Entry::Occupied(storage) = entry {
      Ok(storage.into_ref())
    } else {
      Err(Error::InvalidOperation)
    }
  }

  /// Initialize the database and run migrations.
  pub async fn connect(&self, universal_id: String, path: String) -> Result<()> {
    let storage = self.get_or_create_storage(universal_id.to_owned(), &path);
    storage.connect().await?;
    Ok(())
  }

  pub async fn disconnect(&self, universal_id: String) -> Result<()> {
    let entry = self.inner.entry(universal_id);

    if let Entry::Occupied(entry) = entry {
      let storage = entry.remove();
      storage.close().await;
    }

    Ok(())
  }
}

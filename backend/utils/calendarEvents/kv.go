package main

import (
	"errors"
	"fmt"
	"time"

	"github.com/boltdb/bolt"
)

type KV struct {
	db *bolt.DB
}

func NewDb(pathToDb string) (*KV, error) {

	db, err := bolt.Open(pathToDb, 0600, &bolt.Options{Timeout: 1 * time.Second})
	if err != nil {

		return nil, fmt.Errorf("opening kv: %w", err)
	}

	db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte("MyBucket"))
		if err != nil {
			return fmt.Errorf("create bucket: %s", err)
		}
		return nil
	})

	return &KV{db: db}, nil
}

func (k *KV) Close() error {
	return k.db.Close()
}

func (k *KV) Exists(key string) (bool, error) {
	var exists bool

	err := k.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte("MyBucket"))
		v := b.Get([]byte(key))
		if v != nil {
			exists = true
		}
		return nil
	})

	if err != nil {
		return false, err
	}
	return exists, nil
}

func (k *KV) Get(key string) (string, error) {
	var value string
	return value, k.db.View(
		func(tx *bolt.Tx) error {
			b := tx.Bucket([]byte("MyBucket"))
			v := b.Get([]byte(key))
			if v == nil {
				return errors.New("key not found")
			}
			value = string(v)
			return nil
		})

}

func (k *KV) Set(key, value string) error {
	return k.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte("MyBucket"))
		err := b.Put([]byte(key), []byte(value))
		return err
	})
}

func (k *KV) Delete(key string) error {
	return k.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte("MyBucket"))
		err := b.Delete([]byte(key))

		return err
	})
}

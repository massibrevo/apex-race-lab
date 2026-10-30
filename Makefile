SESSION ?= 9590
.PHONY: setup dev pipeline warehouse transform test
setup:
	python3 -m venv .venv
	.venv/bin/pip install -r requirements-lock.txt

dev:
	python3 -m http.server 4173 --directory dist --bind 127.0.0.1

pipeline:
	.venv/bin/python pipeline/export.py --session $(SESSION)

warehouse:
	.venv/bin/python pipeline/warehouse.py

transform:
	cd dbt && ../.venv/bin/dbt build --profiles-dir . --no-send-anonymous-usage-stats
	.venv/bin/python pipeline/publish.py

test:
	node --test tests/*.test.js
	.venv/bin/python -m unittest discover -s tests -p 'test_*.py'

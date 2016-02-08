import sys
import re

def delete_digits(filename, return_filename):
	f = open(return_filename, 'w')

	lines = open(filename).read().splitlines()
	for line in lines:
		result = ''.join([i for i in line if not i.isdigit()])
		print result
		f.write(result + '\n')

delete_digits('readme-flare-imports.json', 'test2.json')

#!/usr/bin/env python
# coding: utf-8

import ast
import re
import sys
import subprocess


def _do_execute(commands):
    for command in commands:
        command_result = subprocess.run(command.split(), capture_output=True, text=True)
        # yield command_result.stdout.split('\n')
        yield command_result.stdout.strip()


class PreprocessMarkdown2docx:
    """Read a marked up markdown file looking for comment blocks containing macros in the form 
    {'__*__':'value'}
    and values * or commands in the form ${* [__*__]...}
    Resolve all values for token substitution leaving a dictionary of macros and commands that
    may or may not have had tokens expanded.
    """
    
    file = None
    macros = None
    substitute_pattern_compiled = None
    command_pattern_compiled = None
    command_tokens_compiled = None
    macro_start_token = 'MaCrOs'
    macro_end_token = 'END_MaCrOs'
    substitute_pattern = r'__\w+__'  # how to find __token__ for substitution
    command_pattern = r'\$\{([^\}]+)\}'  # how to find ${commands}
    command_tokens = r'(\$\{[^\}]+\})'  # Captures the entire command token
    expanded_commands = {}
    
    def __init__(self, project):
        self.file = '.'.join([project, 'md'])
        self.macros = self.get_macros()
        self.substitute_pattern_compiled = re.compile(self.substitute_pattern)
        self.command_pattern_compiled = re.compile(self.command_pattern)
        self.expanded_commands = self.do_token_substitutions()
        self.command_tokens_compiled = re.compile(self.command_tokens)
        self.error = 'No error'
        
    def get_macros(self):
        macros_dict = {}
        with open(self.file) as f:
            in_a_macro_block = False
            in_a_pre_block = False
            for n, line in enumerate(f):
                line = line.strip()
                if line.startswith('```') and not in_a_pre_block:
                    in_a_pre_block = True
                if line.startswith('```') and in_a_pre_block:
                    in_a_pre_block = False
                if in_a_pre_block:
                    continue
                if line.startswith(self.macro_start_token):
                    in_a_macro_block = True
                    continue
                if line.startswith(self.macro_end_token):
                    in_a_macro_block = False
                if line and len(line):
                    if not line.startswith('#'):
                        if not line.startswith('//'):
                            if in_a_macro_block:
                                try:
                                    k, v = list(ast.literal_eval(line).items())[0]
                                    macros_dict[k] = v
                                except AttributeError as e:
                                    message = f'Attribute ERROR {e} in {file} on line {n}:{line}'
                                    self.error = message
                                    print(message, file=sys.stderr)
                                    exit(1)
                                except SyntaxError:
                                    message = f'Syntax ERROR in {file} on line {n}:{line}'
                                    self.error = message
                                    print(message, file=sys.stderr)
                                    exit(1)
        return macros_dict

    def get_all_but_macros(self):
        markdown = []
        with open(self.file) as f:
            in_a_macro_block = False
            in_a_pre_block = False
            for line in f:
                line_copy = line.strip()
                if line_copy.startswith('```') and not in_a_pre_block:
                    in_a_pre_block = True
                if line_copy.startswith('```') and in_a_pre_block:
                    in_a_pre_block = False
                if line_copy.startswith(self.macro_start_token) and not in_a_pre_block:
                    in_a_macro_block = True
                    markdown.append(line.rstrip('\n'))
                    continue
                if line_copy.startswith(self.macro_end_token) and not in_a_pre_block:
                    in_a_macro_block = False
                if not in_a_macro_block or in_a_pre_block:
                    markdown.append(line.rstrip('\n'))
        return markdown
    
    def do_token_substitutions(self):
        expanded_commands_dict = {}
        for k, v in self.macros.items():
            tokens = self.substitute_pattern_compiled.findall(v)
            for token in tokens:
                if len(token):
                    try:
                        v = v.replace(token, self.macros[token])
                        expanded_commands_dict[k] = v
                    except KeyError as e:
                        message = f'Key ERROR {e} in {self.file} using token {token}'
                        self.error = message
                        print(message, file=sys.stderr)
                        exit(1)
        self.macros.update(expanded_commands_dict)
        return self.macros

    def do_substitute_tokens(self, markdown):
        """for each line in markdown, if a token found in macros is present, then substitute the value
        of the token.
        """
        for i, line in enumerate(markdown.copy()):
            for k, v in self.macros.items():
                if line.find(k) >= 0:
                    line = line.replace(k, v)
                    markdown[i] = line
        return markdown

    def do_execute_commands(self, markdown):
        """For each line in markdown, if a command token is present,
        then execute the command and insert the output of the command.
        """
        modified_markdown = []
        for i, line in enumerate(markdown.copy()):
            execute = self.command_pattern_compiled.findall(line)
            if execute:
                command_token_list = self.command_tokens_compiled.findall(line)
                outputs = list(_do_execute(execute))
                for index, command in enumerate(command_token_list):
                    line = line.replace(command, outputs[index])
            modified_markdown.append(line)
        return modified_markdown


if __name__ == '__main__':
    ppm2w = PreprocessMarkdown2docx('hello.md')
    print(ppm2w.do_token_substitutions())
